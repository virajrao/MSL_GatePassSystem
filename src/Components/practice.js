//  practicing the react js code here in this file 



import React, {useState, useEffect} from 'react';


// function Counter(){

//     const[value,setvalue]= useState(0);
//     // clickEvent = ()=>{
//     //     setvalue(value+1);
//     // }
//     return(
//         <>

//             <p> Count: {value}</p>
//             <button onClick={()=>{  setvalue(value => value+1)  }}> Click ME ! </button>

//         </>
//     );
// };

//  conditional rendering and using the toggle button
// function Counter(){
// const [isLoggedin,setLoggedin] = useState(false);

// // every time the state changes the component will re-render
// // and the value will be updated
// return(
//                 <> 
//                     <div> 
//                         {isLoggedin ? <h1> Welcome User </h1> : <h1> Please Login </h1>}
//                         <button onClick={()=>{
//                             setLoggedin(!isLoggedin);
//                         }}>Press me to Toggle ! </button>
//                     </div>
//                 </>
//         );



// }

{/* <div>{hasmessage&&<p>Hello , I am true and fine . What about you ?</p>}</div> */}



// we are putting the empty array at the end of the useEffect function so that it will run only once when the component is mounted and not on every render.
function Counter({hasmessage}){
        // here we set the data       
        const[data,setdata] = useState(null);
        // runs when the component is mounted (only for first time) 
        useEffect(()=>{
                fetch('https://jsonplaceholder.typicode.com/todos').then((res)=>res.json()).then((data)=>{
                setdata(data);
        }).catch((err)=> console.log(err));  
    },[]);

     
             return <>
             
             {data ? 
             
                <ul>
             {data.map((item)=>{
               return(
                    <li key={item.idx}>
                       {item.title} 
                    </li>
                );


             })} </ul>: 'Loading...'}
             
             </>;
    }

export default Counter;