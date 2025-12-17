import { useEffect, useCallback } from "react";
import { mat4 } from "gl-matrix";
import "./WebGPUCanvas.css";

const WebGPUCanvas = ({ canvasRef, space, importAlert }) => {

    const format = navigator.gpu.getPreferredCanvasFormat();
    // Helper to synchronize canvas element size and WebGPU context size (Fixes Blurriness)
    const handleResizeAndConfigure = useCallback((canv, device, ctx) => {
        const width = canv.clientWidth || window.innerWidth;
        const height = canv.clientHeight || window.innerHeight;

        if (width === 0 || height === 0) return false;

        // Set the canvas drawing buffer resolution
        canv.width = width;
        canv.height = height;


        // Reconfigure the WebGPU context with the new size
        if (device && ctx) {
            ctx.configure({
                device: device,
                format: format,
                alphaMode: 'opaque',
                size: [width, height], // Crucial for non-blurriness and correct aspect
            });
        }
        return true;
    }, []);

    useEffect(() => {
        let device = null;
        let animationFrameId = null;
        let resizeListenerFn = null;

        const initWebGPU = async () => {
            const canv = canvasRef.current;
            if (!canv) return;

            // Set initial size based on visible size
            canv.width = canv.clientWidth || window.innerWidth;
            canv.height = canv.clientHeight || window.innerHeight;


            if (!navigator.gpu) {
                console.error("WebGPU is not supported on this browser.");
                return;
            }

            try {
                const adapter = await navigator.gpu.requestAdapter();
                device = await adapter.requestDevice();
                const ctx = canv.getContext("webgpu");

                // Initial size configuration (Fixes blurriness on load)
                if (!handleResizeAndConfigure(canv, device, ctx)) {
                    return;
                }

                // --- 1. Buffer Preparation (Combined Geometry) ---
                let vertexData = [];
                let objectDrawInfo = []; // Stores the offset/count in the combined buffer
                let offset = 0;

                for (const obj of space.objects) {
                    const vertices = Array.isArray(obj.vertices) ? obj.vertices : Array.from(obj.vertices);
                    // const color = [obj.r ?? 1.0, obj.g ?? 1.0, obj.b ?? 1.0];
                    const color = [.0, .0, .5, 1.0];

                    if (vertices.length % 3 !== 0) continue;

                    for (let i = 0; i < vertices.length; i += 3) {
                        vertexData.push(vertices[i], vertices[i + 1], vertices[i + 2]); // Position (3 floats)
                        vertexData.push(color[0], color[1], color[2]);                 // Color (3 floats)
                    }

                    const vertexCount = vertices.length / 3;
                    objectDrawInfo.push({ offset, count: vertexCount });
                    offset += vertexCount;
                }

                if (offset === 0) {
                    console.warn("No valid geometry found to render.");
                    return;
                }

                const concatVertices = new Float32Array(vertexData);

                const vertexBuffer = device.createBuffer({
                    size: concatVertices.byteLength,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                    mappedAtCreation: true,
                });
                new Float32Array(vertexBuffer.getMappedRange()).set(concatVertices);
                vertexBuffer.unmap();

                // --- 2. Uniform buffer for MVP (Reused for every object) ---
                const uniformBufferSize = 16 * 4; // 64 bytes for mat4
                const uniformBuffer = device.createBuffer({
                    size: uniformBufferSize,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                });

                const bindGroupLayout = device.createBindGroupLayout({
                    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }],
                });

                const bindGroup = device.createBindGroup({
                    layout: bindGroupLayout,
                    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
                });

                // --- 3. Shader and Pipeline (Minimal WGSL) ---
                const shaderModule = device.createShaderModule({
                    code: `
struct Uniforms {
    mvpMatrix : mat4x4f
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VSOutput {
    @builtin(position) position : vec4f,
    @location(0) color : vec3f
};

@vertex
fn vs_main(
    @location(0) position : vec3f,
    @location(1) color : vec3f
) -> VSOutput {
    var output : VSOutput;
    // Apply MVP matrix to the position
    output.position = uniforms.mvpMatrix * vec4f(position, 1.0);
    output.color = color;
    return output;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
    return vec4f(color, 1.0);
}
`
                });

                const pipeline = device.createRenderPipeline({
                    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
                    vertex: {
                        module: shaderModule,
                        entryPoint: "vs_main",
                        buffers: [
                            {
                                arrayStride: 24, // 6 floats (pos + color) * 4 bytes/float
                                attributes: [
                                    { shaderLocation: 0, offset: 0, format: "float32x3" }, // Position
                                    { shaderLocation: 1, offset: 12, format: "float32x3" }, // Color
                                ],
                            }
                        ]
                    },
                    fragment: {
                        module: shaderModule,
                        entryPoint: "fs_main",
                        targets: [{ format }]
                    },
                    primitive: { topology: "triangle-list" }
                });

                // --- 4. Render loop (Per-Object Positioning Logic) ---
                function frame(timestamp) {
                    const aspect = canv.width / canv.height;
                    const now = timestamp / 1000;

                    // Calculate View and Projection ONCE
                    const projection = mat4.create();
                    // FIX: Increase Far Clip Plane for safety (e.g., 1000.0)
                    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 1000.0);

                    const view = mat4.create();
                    mat4.lookAt(view, [0, 0, 80], [0, 0, 0], [0, 1, 0]);

                    const commandEncoder = device.createCommandEncoder();
                    const textureView = ctx.getCurrentTexture().createView();

                    const renderPass = commandEncoder.beginRenderPass({
                        colorAttachments: [{
                            view: textureView,
                            loadOp: "clear",
                            storeOp: "store",
                            clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 }
                        }]
                    });

                    renderPass.setPipeline(pipeline);
                    renderPass.setBindGroup(0, bindGroup);
                    renderPass.setVertexBuffer(0, vertexBuffer);

                    // Loop through the segments to draw each object
                    for (let i = 0; i < objectDrawInfo.length; i++) {
                        const drawInfo = objectDrawInfo[i];
                        const obj = space.objects[i]; // Get the object with position data

                        // A. Create unique Model Matrix (M)
                        const model = mat4.create();

                        // B. Apply object-specific position (Translation)
                        // Note: Assumes obj.position is {x, y, z}
                        mat4.translate(model, model, [obj.position.x, obj.position.y, obj.position.z]);

                        // C. Apply object-specific rotation (Optional)
                        // mat4.rotateY(model, model, now * 0.5);

                        // D. Calculate MVP Matrix: P * V * M
                        const mvp = mat4.create();
                        mat4.multiply(mvp, view, model);      // V * M
                        mat4.multiply(mvp, projection, mvp);  // P * (V * M)

                        // E. Write the NEW MVP matrix to the uniform buffer
                        device.queue.writeBuffer(uniformBuffer, 0, mvp);

                        // F. Draw this object's segment
                        renderPass.draw(drawInfo.count, 1, drawInfo.offset, 0);
                    }

                    renderPass.end();
                    device.queue.submit([commandEncoder.finish()]);

                    animationFrameId = requestAnimationFrame(frame);
                }

                animationFrameId = requestAnimationFrame(frame);

                // --- Resize Listener Setup (Fixes non-resizing and blurriness) ---
                resizeListenerFn = () => handleResizeAndConfigure(canv, device, ctx);
                window.addEventListener('resize', resizeListenerFn);

            } catch (error) {
                console.error("WebGPU Initialization Error:", error);
            }
        };

        initWebGPU();

        // FIX 5: Robust Cleanup Function (Crucial for fixing the flaky activation)
        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            if (resizeListenerFn) {
                window.removeEventListener('resize', resizeListenerFn);
            }
        };

    }, [importAlert]); // Depend on stable helper   

    return <canvas ref={canvasRef} className="webgpu-canvas" />;
};

export default WebGPUCanvas;