const messagesEl=document.getElementById("messages");
const exploreBtn=document.getElementById("exploreBtn");
const form=document.getElementById("commandForm");
const input=document.getElementById("commandInput");
const chatTitle=document.getElementById("chatTitle");

function scrollToUI(){document.getElementById("discord-ui").scrollIntoView({behavior:"smooth"})}
exploreBtn.addEventListener("click",scrollToUI);
exploreBtn.addEventListener("keydown",(e)=>{if(e.key==="Enter")scrollToUI()});

const start=Date.now();
let currentChannel="bots";
const store={general:[],bots:[],"dev-chat":[],showcase:[]};
const aliases={h:"help",commands:"help",latency:"ping",up:"uptime",inv:"invite",s:"stats"};
let lastCommandAt=0;const COOLDOWN_MS=800;
let guessGame=null;
const registry={
  help:()=>({type:"bot",text:["Available commands:","!help (!commands, !h)","!ping (!latency)","!uptime (!up)","!invite (!inv)","!stats (!s)","!roll [1-100]","!echo <text>","!clear","!joke","!guess <min> <max>"].join("\n")} ),
  ping:()=>({type:"bot",text:"Pong! "+(Math.random()*100).toFixed(2)+"ms"}),
  uptime:()=>({type:"bot",text:formatDuration(Date.now()-start)}),
  invite:()=>({type:"bot",text:"Invite link:\nhttps://discord.com/oauth2/authorize?client_id=123&scope=bot+applications.commands&permissions=8"}),
  stats:()=>({type:"bot",text:["Stats:","Servers: 42","Users: 12,403","Commands: 18","CPU: 17%","Mem: 256MB"].join("\n")}),
  roll:(args)=>{if(args.length&&(!/^[0-9]+$/.test(args[0])||parseInt(args[0],10)<1||parseInt(args[0],10)>100)){return{type:"error",text:"Invalid range. Use !roll [1-100]"}}const n=clamp(parseInt(args[0]||"100",10)||100,1,100);return{type:"bot",text:"You rolled "+Math.floor(Math.random()*n+1)+"/"+n}},
  echo:(args)=>({type:"bot",text:args.join(" ")||""}),
  clear:()=>{messagesEl.innerHTML="";return{type:"bot",text:"Cleared"}},
  joke:async()=>({type:"bot",text:await getRandomJoke()}),
  guess:(args)=>{if(args.length<2||!/^[0-9]+$/.test(args[0])||!/^[0-9]+$/.test(args[1])){return{type:"error",text:"Start a game: !guess <min> <max>"}}const min=parseInt(args[0],10),max=parseInt(args[1],10);if(min>=max){return{type:"error",text:"Min must be less than max"}}guessGame={min,max,target:Math.floor(Math.random()*(max-min+1))+min,attempts:0};return{type:"bot",text:`Guess a number between ${min} and ${max}. Type guesses as messages.`}}
};

async function getRandomJoke(){
  const fallback=[
    "I would tell you a UDP joke, but you might not get it.",
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are 10 kinds of people: those who understand binary and those who don't.",
    "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'"
  ];
  try{
    const r=await fetch('https://v2.jokeapi.dev/joke/Any?type=single',{cache:'no-store'});
    if(!r.ok)throw new Error('bad');
    const j=await r.json();
    return j.joke||"No joke found";
  }catch{
    return fallback[Math.floor(Math.random()*fallback.length)];
  }
}

function handleGuessAttempt(raw){const val=parseInt(raw,10);if(Number.isNaN(val)){addMessage("bot",`Please enter a number between ${guessGame.min} and ${guessGame.max}.`,true,"error");return}if(val<guessGame.min||val>guessGame.max){addMessage("bot",`Out of range. Try between ${guessGame.min}-${guessGame.max}.`,true,"error");return}guessGame.attempts++;if(val<guessGame.target){addMessage("bot","Too low. Try again.",true);return}if(val>guessGame.target){addMessage("bot","Too high. Try again.",true);return}addMessage("bot",`Congrats! You guessed ${val} in ${guessGame.attempts} attempts.`,true);guessGame=null}

function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function formatDuration(ms){const s=Math.floor(ms/1000);const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=s%60;return `Uptime ${h}h ${m}m ${sec}s`}

function addMessage(author,text,isBot,variant){const msg=document.createElement("div");msg.className="msg";const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=isBot?"B":"U";const bubble=document.createElement("div");bubble.className="bubble"+(isBot?" bot":"")+(variant?" "+variant:"");bubble.textContent=text;const meta=document.createElement("div");meta.className="meta";meta.textContent=`${author} • ${new Date().toLocaleTimeString()}`;msg.appendChild(avatar);msg.appendChild(bubble);msg.appendChild(meta);messagesEl.appendChild(msg);messagesEl.scrollTop=messagesEl.scrollHeight;return msg}

function bootstrap(){
  store.general.push({author:"system",text:"Welcome to the server!",isBot:true});
  store.general.push({author:"mod",text:"Please keep it friendly.",isBot:true});
  store.bots.push({author:"bot",text:"Welcome to the bot sandbox. Type \"!help\" to get started.",isBot:true});
  store["dev-chat"].push({author:"dev",text:"Discuss implementation details here.",isBot:true});
  store.showcase.push({author:"system",text:"Share bot demos and videos.",isBot:true});
  renderChannel(currentChannel);
}
bootstrap();

form.addEventListener("submit",(e)=>{e.preventDefault();const raw=(input.value||"").trim();if(!raw)return;input.value="";store[currentChannel].push({author:"you",text:raw,isBot:false});addMessage("you",raw,false);if(currentChannel!=="bots")return;const isCommand=raw.startsWith('!');if(!isCommand&&guessGame){const typing=addMessage("bot","Bot is typing…",true,"typing");setTimeout(()=>{typing.remove();handleGuessAttempt(raw)},450);return}const now=Date.now();if(now-lastCommandAt<COOLDOWN_MS){store[currentChannel].push({author:"bot",text:"You're doing that too fast. Please wait a moment.",isBot:true});addMessage("bot","You're doing that too fast. Please wait a moment.",true,"error");return}lastCommandAt=now;const typing=addMessage("bot","Bot is typing…",true,"typing");setTimeout(()=>{typing.remove();handleCommand(raw)},500)});

function handleCommand(raw){const parts=raw.split(/\s+/);let name=(parts[0]||"").replace(/^!/,'').toLowerCase();name=aliases[name]||name;const args=parts.slice(1);const cmd=registry[name];if(!cmd){store[currentChannel].push({author:"bot",text:"Unknown command. Type !help for options.",isBot:true});addMessage("bot","Unknown command. Type !help for options.",true,"error");return}const res=cmd(args);if(res&&typeof res.then==='function'){res.then(out=>{if(!out)return;const variant=out.type==="error"?"error":undefined;const text=String(out.text||"");store[currentChannel].push({author:"bot",text:text,isBot:true});addMessage("bot",text,true,variant)}).catch(()=>{store[currentChannel].push({author:"bot",text:"Failed to run command.",isBot:true});addMessage("bot","Failed to run command.",true,"error")});return}if(!res)return;const variant=res.type==="error"?"error":undefined;const text=String(res.text||"");store[currentChannel].push({author:"bot",text:text,isBot:true});addMessage("bot",text,true,variant)}

function renderChannel(name){currentChannel=name;chatTitle.textContent=name;messagesEl.innerHTML="";store[name].forEach(m=>addMessage(m.author,m.text,m.isBot));document.querySelectorAll('.channel').forEach(el=>{el.classList.toggle('active',el.getAttribute('data-channel')===name)});updatePlaceholder()}

function updatePlaceholder(){if(currentChannel==="bots"){input.placeholder="Type a command, e.g. !help";setTimeout(()=>input.focus(),50)}else{input.placeholder="Type a message"}}
updatePlaceholder();

document.querySelectorAll('.channel').forEach(el=>{el.addEventListener('click',()=>{renderChannel(el.getAttribute('data-channel'))})});

document.addEventListener('keydown',(e)=>{
  if(e.key==='/'||e.key==='!'){if(currentChannel!=='bots'){renderChannel('bots')}setTimeout(()=>{input.focus();if(e.key==='!'&&input.value.trim()===''){input.value='!'}},20)}
});
