import React from 'react'
import './Card.css'

function Card(props){
  return <div className="card">
    <img src={props.img} alt="" />
    <div className="overlay">

      <h1>{props.name}</h1>
      <p>{props.desc}</p>

    </div>
  </div>
}

export default Card