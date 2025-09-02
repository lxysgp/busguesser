const bustops = await fetch("final.json").then(res => res.json())
const busroutes = await fetch("https://data.busrouter.sg/v1/services.json").then(res => res.json())

const busstoph1s = document.querySelectorAll("div div h1")
const busstops = document.querySelector("body > div")
const startbusstophtml = document.querySelectorAll("div div div")[0]
const endbusstophtml = document.querySelectorAll("div div div")[1]
const dialog = document.querySelector("dialog")
const dialogdiv = dialog.querySelector("dialog div")

const keys = Object.keys(bustops)
const startbusstopnum = keys[Math.round(Math.random() * keys.length)]
const endbusstopnum = keys[Math.floor(Math.random() * keys.length)]

busstoph1s[0].innerText = bustops[startbusstopnum][0]
busstoph1s[1].innerText = bustops[endbusstopnum][0]

if (bustops[startbusstopnum][1].some(r => bustops[endbusstopnum][1].includes(r))) {location.reload()}

function addnewbusstop(stopnum) {
  if (stopnum == endbusstopnum) {
    dialog.innerHTML = `<h1 style="font-family: sans-serif">You have reached the destination!</h1><br><button onclick='location.reload()'>Restart</button>`
    return
  }
  dialog.close()
  const newstop = document.createElement("div")
  newstop.innerHTML = `
    <h1>${bustops[stopnum][0]}</h1>
    <div></div>
  `
  busstops.insertBefore(newstop,busstops.children[busstops.children.length - 1])
  bustops[stopnum][1].forEach(element => {
    newstop.innerHTML += `<button onclick="showbusroute('${element}')">${element}</button>`
  });
  const allbuttons = document.querySelectorAll("button")
  allbuttons.forEach(button => {
    if (button.parentElement == newstop || button.parentElement == endbusstophtml) return
    button.disabled = true
  })
}

function showbusroute(busnumber) {
  dialog.showModal()
  dialog.querySelector("h1").innerText = busnumber
  dialogdiv.innerHTML = ""
  console.log(busroutes[busnumber]["routes"])
  busroutes[busnumber]["routes"].forEach(lap => {
    lap.forEach(stop => {
      dialogdiv.innerHTML += `<button onclick="addnewbusstop('${stop}')">${bustops[stop][0]}</button>`
    })
  })
}

window.showbusroute = showbusroute
window.addnewbusstop = addnewbusstop

bustops[startbusstopnum][1].forEach(element => {
  startbusstophtml.innerHTML += `<button onclick="showbusroute('${element}')">${element}</button>`
});
bustops[endbusstopnum][1].forEach(element => {
  endbusstophtml.innerHTML += `<button>${element}</button>`
});