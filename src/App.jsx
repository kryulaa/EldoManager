import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase=createClient(
  "https://dolvcjxiixcgnlueuayi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbHZjanhpaXhjZ25sdWV1YXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODI3MDgsImV4cCI6MjA5MDE1ODcwOH0.srOhK7Ah55VyCOWPsje0jf4rUvDzIOPDl3kO554kVz4"
)

export default function App(){

const [accounts,setAccounts]=useState([])
const [search,setSearch]=useState("")
const [inventory,setInventory]=useState(null)

async function load(){

const {data,error}=await supabase
.from("accounts")
.select("*")

if(!error){
setAccounts(data||[])
}

}

useEffect(()=>{

load()

const interval=setInterval(
load,
5000
)

return()=>{
clearInterval(interval)
}

},[])



const filtered=accounts.filter(acc=>

(acc.username||"")
.toLowerCase()
.includes(
search.toLowerCase()
)

)


const grouped=useMemo(()=>{

const result={}

filtered.forEach(acc=>{

const pc=
acc.pc || "UNKNOWN"

if(!result[pc])
result[pc]=[]

result[pc].push(acc)

})

return result

},[filtered])


const onlineCount=
accounts.filter(acc=>{

const age=
Math.floor(
(new Date()-new Date(acc.updated_at))/1000
)

return age<60

}).length


const totalGems=
accounts.reduce(
(sum,x)=>sum+(x.gems||0),
0
)



return(

<div className="
min-h-screen
bg-zinc-950
text-white
p-6
">

<div className="
max-w-[1700px]
mx-auto
">

<div className="mb-8">

<h1 className="
text-5xl
font-bold
">
KIRAYU Dashboard
</h1>

<div className="
text-zinc-400
mt-2
">
Live Tracker
</div>

</div>



<div className="
grid
grid-cols-4
gap-4
mb-8
">

<Card
title="Accounts"
value={accounts.length}
/>

<Card
title="Online"
value={onlineCount}
/>

<Card
title="Offline"
value={
accounts.length-onlineCount
}
/>

<Card
title="Total Gems"
value={totalGems}
/>

</div>



<div className="
flex
justify-end
mb-8
">

<input
value={search}
onChange={(e)=>
setSearch(
e.target.value
)
}
placeholder="Search username..."
className="
bg-zinc-900
border
border-zinc-800
rounded-xl
px-4
py-3
w-[300px]
outline-none
"
/>

</div>



{
Object.entries(grouped)
.map(([pc,rows])=>(

<div
key={pc}
className="
mb-10
"
>

<div className="
text-3xl
font-bold
mb-4
px-2
">

🖥 {pc}

</div>


<div className="
bg-zinc-900
border
border-zinc-800
rounded-3xl
overflow-hidden
shadow-2xl
">

<div className="
max-h-[500px]
overflow-y-auto
">

<table className="
w-full
">

<thead className="
bg-zinc-800
sticky
top-0
z-10
">

<tr>

<th className="
p-4
text-left
">
Status
</th>

<th className="
text-left
">
Username
</th>

<th>Seeds</th>
<th>Gems</th>
<th>XP</th>
<th>Wins</th>
<th>Wave</th>
<th>Units</th>
<th>Storage</th>
<th>Updated</th>

</tr>

</thead>


<tbody>

{
rows.map(acc=>{

const age=
Math.floor(
(new Date()-new Date(acc.updated_at))/1000
)

const online=
age<60

return(

<tr
key={acc.id}
className="
border-t
border-zinc-800
hover:bg-zinc-800
transition
"
>

<td className="p-4">

<div className="
flex
items-center
gap-2
">

<div
className={`
w-3
h-3
rounded-full

${online
?
"bg-green-500"
:
"bg-red-500"
}
`}
></div>

{online
?
"Online"
:
"Offline"}

</div>

</td>

<td className="
font-semibold
">

{acc.username}

</td>

<td>{acc.seeds}</td>
<td>{acc.gems}</td>
<td>{acc.xp}</td>
<td>{acc.games_won}</td>
<td>{acc.wave}</td>
<td>{acc.units}</td>


<td>

<button
onClick={()=>
setInventory(
acc.inventory
)
}
className="
bg-indigo-600
hover:bg-indigo-500
px-4
py-2
rounded-xl
"
>

Storage

</button>

</td>


<td className="
text-zinc-400
text-sm
">

{age}s ago

</td>

</tr>

)

})

}

</tbody>

</table>

</div>

</div>

</div>

))

}



{
inventory &&

<div className="
fixed
inset-0
bg-black/70
backdrop-blur-sm
flex
justify-center
items-center
z-50
">

<div className="
bg-zinc-900
rounded-3xl
border
border-zinc-700
w-[600px]
max-h-[700px]
overflow-auto
p-6
">

<div className="
flex
justify-between
mb-6
">

<h2 className="
text-3xl
font-bold
">

Storage Inventory

</h2>


<button
onClick={()=>
setInventory(null)
}
className="
bg-red-500
px-4
rounded-xl
"
>

X

</button>

</div>


<div className="
grid
gap-2
">

{
inventory.length
?

inventory.map(
(item,i)=>(

<div
key={i}
className="
bg-zinc-800
rounded-xl
p-3
flex
justify-between
"
>

<div>

{item.name}

</div>

<div>

x{item.quantity}

</div>

</div>

)
)

:

<div className="
text-zinc-500
text-center
">

No inventory

</div>

}

</div>

</div>

</div>

}



</div>

</div>

)

}


function Card({
title,
value
}){

return(

<div className="
bg-zinc-900
border
border-zinc-800
rounded-3xl
p-6
">

<div className="
text-zinc-400
text-sm
">
{title}
</div>

<div className="
text-4xl
font-bold
mt-2
">

{value}

</div>

</div>

)

}