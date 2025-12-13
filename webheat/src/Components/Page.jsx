import { useEffect, useState } from "react";
import UI from "./UI/UI";





const Page = () => {

    const [objects, setObjects] = useState([]);


    useEffect(
        () => {
            console.log(objects);
        }, [objects]
    )

    return <>
    
    
    <UI objects={objects} setObjects={setObjects}/>
    
    </>


}



export default Page;