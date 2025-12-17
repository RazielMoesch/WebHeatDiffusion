import { useEffect, useRef, useCallback } from "react";
import { mat4, vec3 } from "gl-matrix";
import "./WebGPUCanvas.css";

const WebGPUCanvas = ({ canvasRef, space }) => {
    const gpuState = useRef({
        device: null,
        context: null,
        pipeline: null,
        uniformBuffer: null,
        bindGroup: null,
        vertexBuffer: null,
        objectDrawInfo: [],
        animationFrameId: null,
        rotation: { x: 0, y: 0 },
        translation: { x: 0, y: 0 },
        isDragging: false,
        lastMousePos: { x: 0, y: 0 }
    });

    const handleResize = useCallback((canvas, device, context) => {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        if (width === 0 || height === 0) return;
        canvas.width = width;
        canvas.height = height;
        context.configure({
            device: device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: 'opaque',
        });
    }, []);

    // --- 1. Geometry Prep (Now including Normals) ---
    const prepareGeometry = (device, objects) => {
        let vertexData = [];
        let objectDrawInfo = [];
        let offset = 0;

        for (const obj of objects) {
            const vertices = Array.from(obj.vertices);
            const color = [0.0, 0.5, 0.8]; 

            // We calculate "Flat Normals" for each triangle
            for (let i = 0; i < vertices.length; i += 9) {
                const p1 = [vertices[i], vertices[i+1], vertices[i+2]];
                const p2 = [vertices[i+3], vertices[i+4], vertices[i+5]];
                const p3 = [vertices[i+6], vertices[i+7], vertices[i+8]];

                // Vector math: (P2-P1) cross (P3-P1) to get the face normal
                const v1 = vec3.subtract([], p2, p1);
                const v2 = vec3.subtract([], p3, p1);
                const normal = vec3.cross([], v1, v2);
                vec3.normalize(normal, normal);

                // Push 3 vertices for the triangle
                for (let j = 0; j < 3; j++) {
                    const idx = i + j * 3;
                    vertexData.push(vertices[idx], vertices[idx+1], vertices[idx+2]); // Pos
                    vertexData.push(...color);                                       // Color
                    vertexData.push(normal[0], normal[1], normal[2]);                // Normal
                }
            }

            const vertexCount = vertices.length / 3;
            objectDrawInfo.push({ offset, count: vertexCount });
            offset += vertexCount;
        }

        const vertexBuffer = device.createBuffer({
            size: new Float32Array(vertexData).byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertexData);
        vertexBuffer.unmap();
        return { vertexBuffer, objectDrawInfo };
    };

    // --- 2. Shader & Pipeline (Lambert Lighting Math) ---
    const createPipeline = (device, format) => {
        const uniformBuffer = device.createBuffer({
            size: 64, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
        });

        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
        });

        const shaderModule = device.createShaderModule({
            code: `
                struct Uniforms { mvp : mat4x4f };
                @group(0) @binding(0) var<uniform> uniforms : Uniforms;

                struct Out {
                    @builtin(position) pos : vec4f,
                    @location(0) color : vec3f,
                    @location(1) normal : vec3f,
                };

                @vertex fn vs(@location(0) pos: vec3f, @location(1) col: vec3f, @location(2) normal: vec3f) -> Out {
                    var o: Out;
                    o.pos = uniforms.mvp * vec4f(pos, 1.0);
                    o.color = col;
                    // We pass the normal through (simplified: assumes no non-uniform scaling)
                    o.normal = normal; 
                    return o;
                }

                @fragment fn fs(@location(0) col: vec3f, @location(1) normal: vec3f) -> @location(0) vec4f {
                    let lightDir = normalize(vec3f(0.5, 0.5, 1.0)); // Direction of light source
                    let ambient = 0.2; // Constant low-level light
                    
                    // Lambertian diffuse: dot product of normal and light direction
                    let diffuse = max(dot(normalize(normal), lightDir), 0.0);
                    
                    let lighting = max(ambient + diffuse, .5);
                    return vec4f(col * lighting, 1.0);
                }
            `
        });

        const pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            vertex: {
                module: shaderModule,
                entryPoint: "vs",
                buffers: [{
                    arrayStride: 36, // (3 pos + 3 col + 3 norm) * 4 bytes
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" },  // Position
                        { shaderLocation: 1, offset: 12, format: "float32x3" }, // Color
                        { shaderLocation: 2, offset: 24, format: "float32x3" }  // Normal
                    ]
                }]
            },
            fragment: { module: shaderModule, entryPoint: "fs", targets: [{ format }] },
            primitive: { topology: "triangle-list" },
            // Add Depth Stencil for proper 3D layering
            depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' }
        });

        return { pipeline, uniformBuffer, bindGroup };
    };

    // --- 3. Render Loop & Depth Texture ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !navigator.gpu) return;

        let depthTexture;

        const init = async () => {
            const adapter = await navigator.gpu.requestAdapter();
            const device = await adapter.requestDevice();
            const context = canvas.getContext("webgpu");
            const format = navigator.gpu.getPreferredCanvasFormat();

            handleResize(canvas, device, context);
            
            // Create a depth texture for the z-buffer
            depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });

            const { vertexBuffer, objectDrawInfo } = prepareGeometry(device, space.objects);
            const { pipeline, uniformBuffer, bindGroup } = createPipeline(device, format);

            gpuState.current = { 
                ...gpuState.current, 
                device, context, pipeline, uniformBuffer, bindGroup, vertexBuffer, objectDrawInfo, depthTexture 
            };

            const render = () => {
                drawFrame(gpuState.current, space.objects);
                gpuState.current.animationFrameId = requestAnimationFrame(render);
            };
            render();
        };

        init();

        // Mouse Listeners (Same as before)
        const onMouseDown = (e) => { gpuState.current.isDragging = true; gpuState.current.lastMousePos = { x: e.clientX, y: e.clientY }; };
        const onMouseMove = (e) => {
            if (!gpuState.current.isDragging) return;
            const deltaX = e.clientX - gpuState.current.lastMousePos.x;
            const deltaY = e.clientY - gpuState.current.lastMousePos.y;
            if (e.buttons === 2) { // Right Click: Rotate
                gpuState.current.rotation.y += deltaX * 0.01;
                gpuState.current.rotation.x += deltaY * 0.01;
            } else if (e.buttons === 4) { // Middle Click: Pan
                gpuState.current.translation.x += deltaX * 0.1;
                gpuState.current.translation.y -= deltaY * 0.1;
            }
            gpuState.current.lastMousePos = { x: e.clientX, y: e.clientY };
        };
        const onMouseUp = () => gpuState.current.isDragging = false;
        
        canvas.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        return () => {
            canvas.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            cancelAnimationFrame(gpuState.current.animationFrameId);
        };
    }, [space.objects, handleResize, canvasRef]);

    const drawFrame = (state, objects) => {
        const { device, context, pipeline, uniformBuffer, bindGroup, vertexBuffer, objectDrawInfo, rotation, translation, depthTexture } = state;
        if (!device || !pipeline) return;

        const canvas = canvasRef.current;
        const projection = mat4.create();
        mat4.perspective(projection, Math.PI / 4, canvas.width / canvas.height, 0.1, 1000.0);
        const view = mat4.create();
        mat4.lookAt(view, [0, 0, 150], [0, 0, 0], [0, 1, 0]);

        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                storeOp: "store"
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        });

        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);

        objectDrawInfo.forEach((info, i) => {
            const obj = objects[i];
            const model = mat4.create();
            mat4.translate(model, model, [translation.x, translation.y, 0]);
            mat4.translate(model, model, [obj.position.x, obj.position.y, obj.position.z]);
            mat4.rotateX(model, model, rotation.x);
            mat4.rotateY(model, model, rotation.y);

            const mvp = mat4.create();
            mat4.multiply(mvp, view, model);
            mat4.multiply(mvp, projection, mvp);

            device.queue.writeBuffer(uniformBuffer, 0, mvp);
            renderPass.setBindGroup(0, bindGroup);
            renderPass.draw(info.count, 1, info.offset, 0);
        });

        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
    };

    return <canvas ref={canvasRef} className="webgpu-canvas" style={{ cursor: 'grab' }} />;
};

export default WebGPUCanvas;