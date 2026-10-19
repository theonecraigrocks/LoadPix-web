import {CATEGORIES,heading,normalizePhone,normalizeBOL,newSession,missingPhotos,messageBody,batchCount} from "./core.mjs";
import {openLoadPixDB,allSessions,loadSession,saveSession,loadPhoto,savePhoto,removePhoto,deleteSessions} from "./db.mjs";

const app = document.getElementById("app");
const inputCamera = document.getElementById("camera-input");
const notice = document.getElementById("notice");
const PRIMARY = "btn";
const SECONDARY = "btn secondary";
const state = {
  page: "home", sessionID: null, selected: new Set(), batch: 0,
  capture: null, urls: [], renderID: 0
};
let noticeTimer;

function h(tag, options = {}, ...children) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.text !== undefined) el.textContent = String(options.text);
  if (options.type) el.type = options.type;
  if (options.title) el.title = options.title;
  if (options.htmlFor) el.htmlFor = options.htmlFor;
  if (options.id) el.id = options.id;
  for (const child of children.flat()) {
    if (child == null) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}
function button(text, handler, css = PRIMARY, disabled = false) {
  const btn = h("button", {className:css, type:"button", text});
  btn.disabled = disabled;
  btn.addEventListener("click", handler);
  return btn;
}
function para(text, css = "") { return h("p", {className:css, text}); }
function card(...children) { return h("section", {className:"card"}, children); }
function stack(...children) { return h("div", {className:"stack"}, children); }
function title(text) { return h("h1", {text}); }
function nav(page, id = null) {
  state.page = page; state.sessionID = id; state.batch = 0;
  state.selected.clear();
  window.scrollTo({top:0,behavior:"instant"});
  render().catch(fail);
}
function alertStatus(message) {
  notice.textContent = message;
  notice.classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove("show"), 6000);
}
function fail(error) {
  console.error("LoadPix error:",error);
  alertStatus((error && error.message) || String(error) || "Something went wrong. Your saved photos were not intentionally deleted.");
}
function revokeURLs() {
  for (const url of state.urls) URL.revokeObjectURL(url);
  state.urls = [];
}
function photoURL(blob) {
  const url = URL.createObjectURL(blob);
  state.urls.push(url);
  return url;
}
function loadProfile() {
  try {
    const v = JSON.parse(localStorage.getItem("loadpix.profile") || "{}");
    return {driver:String(v.driver||""),truck:String(v.truck||""),dispatch:String(v.dispatch||"")};
  } catch { return {driver:"",truck:"",dispatch:""}; }
}
function saveProfile(profile) {
  try { localStorage.setItem("loadpix.profile",JSON.stringify(profile)); }
  catch { alertStatus("Browser settings could not be saved. Check Safari storage settings."); }
}
function theme() {
  try { return localStorage.getItem("loadpix.theme") || "phone"; }
  catch { return "phone"; }
}
function setTheme(mode) {
  if (!["light","dark","phone"].includes(mode)) mode="phone";
  document.documentElement.dataset.mode = mode;
  try { localStorage.setItem("loadpix.theme",mode); } catch { /* storage may be blocked */ }
}
setTheme(theme());

function field(label,value,onChange,extra={}) {
  const labelElement = h("label",{className:"field"});
  const caption = h("span",{text:label});
  const input = document.createElement(extra.multiline ? "textarea" : "input");
  if (!extra.multiline) input.type = extra.type || "text";
  input.value = value || "";
  if(extra.maxLength) input.maxLength = extra.maxLength;
  if(extra.placeholder) input.placeholder=extra.placeholder;
  if(extra.inputMode) input.inputMode=extra.inputMode;
  if(extra.disabled) input.disabled=true;
  input.autocomplete = "off";
  input.addEventListener("change",() => Promise.resolve(onChange(input.value)).catch(fail));
  labelElement.append(caption,input);
  return labelElement;
}
function toolbar(label) {
  const bar = h("div",{className:"stack"});
  bar.append(button("← Back to loads",() => nav("home"),SECONDARY), title(label));
  return bar;
}

async function render() {
  const id=++state.renderID;
  revokeURLs();
  app.replaceChildren();
  try {
    await openLoadPixDB();
    if(id!==state.renderID)return;
    if(state.page==="settings") return renderSettings();
    if(state.page==="history") return await renderHistory(id);
    if(state.page==="session") return await renderSession(id);
    return await renderHome(id);
  } catch(error) {
    if(id!==state.renderID)return;
    app.append(card(title("Device storage unavailable"),para("LoadPix needs Safari's local photo storage. Open the app in normal Safari (not Private Browsing), check storage availability, and reload."),para(error.message,"muted small"),button("Retry",() => render(),SECONDARY)));
    fail(error);
  }
}
async function renderHome(id) {
  const sessions=await allSessions();
  if(id!==state.renderID) return;
  const profile=loadProfile();
  app.append(
    h("p",{className:"eyebrow",text:"ON-DEVICE DISPATCH PHOTO ORGANIZER"}),
    title("Ready for the next load?"),
    para("Dispatch: "+(profile.dispatch||"Not configured yet"),"muted"),
    card(
      stack(
        button("🚛 Pick Up Load",()=> startLoad("Pickup",profile)),
        button("📦 Drop Off Load",()=> startLoad("Delivery",profile)),
        button("Session History ("+sessions.length+")",()=>nav("history"),SECONDARY),
        button("Settings & Appearance",()=>nav("settings"),SECONDARY)
      )
    ),
    card(
      h("h3",{text:"Private and under your control"}),
      para("Your photos stay in local browser storage, not a server. They are removed from LoadPix when you delete the session.","small"),
      para("Important: Safari can clear website data, and removing this web app can erase saved sessions. Confirm dispatch receives the photos and save any critical originals elsewhere before deleting.","muted small")
    ),
    card(
      h("h3",{text:"Install this on your iPhone"}),
      para("In Safari: Share → Add to Home Screen → Open as Web App → Add.","small"),
      para("When you share a batch, choose Messages, confirm the dispatch recipient and attachments, then tap Send. The app cannot send automatically.","muted small")
    )
  );
}
async function startLoad(type,profile) {
  try {
    const session=newSession(type,profile,crypto.randomUUID(),Date.now());
    await saveSession(session);
    nav("session",session.id);
  } catch(e){fail(e);}
}
function renderSettings() {
  const profile=loadProfile();
  const form = card(h("h2",{text:"Driver & dispatch"}));
  const edit=(key,v,max) => field(key,v,(value) => { profile[key === "Driver name" ? "driver" : key === "Truck number" ? "truck" : "dispatch"]=String(value).trim().slice(0,max); saveProfile(profile); },{maxLength:max});
  form.append(
    edit("Driver name",profile.driver,80),
    edit("Truck number",profile.truck,40),
    field("Dispatch phone number",profile.dispatch,v=> {
      const phone=normalizePhone(v);
      if(!phone){alertStatus("Enter one dispatch number with area code.");return;}
      profile.dispatch=phone;saveProfile(profile);
      alertStatus("Dispatch number saved on this iPhone.");
    },{type:"tel",inputMode:"tel",maxLength:26}),
    para("Driver name and truck number are reused for new sessions. Trailer number and BOL last four are saved separately for each load.","muted small")
  );
  const appearance=card(h("h2",{text:"Appearance"}));
  const modes=h("div",{className:"stack"});
  for(const mode of ["phone","light","dark"]){
    const label={phone:"Phone mode (follow system)",light:"Light mode",dark:"Dark mode"}[mode];
    modes.append(button((theme()===mode?"✓ ":"○ ")+label,()=>{setTheme(mode);renderSettingsPage();},SECONDARY));
  }
  appearance.append(modes);
  const permissions=card(
    h("h2",{text:"Camera and sharing instructions"}),
    para("On iPhone, tap Take Photo and permit Safari to use the camera if prompted. Unlike Android, there is no three-dot restricted settings switch.","small"),
    para("When ready, LoadPix opens the iPhone Share sheet. Choose Messages, enter/verify dispatch's number, check that the photos and LOAD PICKUP / LOAD DELIVERY heading appear, then tap Send.","small"),
    para("The share sheet may omit message text or attachments on some iPhones. Always inspect the draft. If file sharing is unavailable, copy the details, save the photos and attach them in Messages manually.","muted small")
  );
  const donate=card(
    h("h2",{text:"Support development"}),
    para("PayPal handle supplied by the developer: @ellerdaddy. Check the recipient name before donating.","muted small"),
    button("Donate to developer",()=>{
      if(window.confirm("Open PayPal for @ellerdaddy? Confirm the correct recipient in PayPal before sending any money.")){
        window.open("https://www.paypal.com/paypalme/ellerdaddy","_blank","noopener,noreferrer");
      }
    },SECONDARY)
  );
  app.replaceChildren(toolbar("Settings"),form,appearance,permissions,donate);
}
function renderSettingsPage(){app.replaceChildren();renderSettings();}
async function renderHistory(id) {
  const sessions=await allSessions(); if(id!==state.renderID)return;
  const headingArea=toolbar("Saved sessions");
  const bulk=card(h("h3",{text:"Manage sessions"}));
  bulk.append(h("div",{className:"columns"},
    button("Select all",()=>{state.selected=new Set(sessions.map(s=>s.id));render();},SECONDARY),
    button("Clear",()=>{state.selected.clear();render();},SECONDARY)));
  if(state.selected.size>0){
    bulk.append(button("Delete "+state.selected.size+" selected session(s)",async ()=>{
      if(!window.confirm("Permanently delete the selected sessions AND their original photos from this phone? This cannot be undone."))return;
      try {const total=await deleteSessions([...state.selected]);state.selected.clear();alertStatus(total+" session(s) deleted.");render();}
      catch(e){fail(e);}
    },"btn danger"));
  }
  app.append(headingArea,bulk);
  if(!sessions.length){app.append(card(para("No saved loads yet. Start your first pickup or delivery.")));return;}
  for(const session of sessions){
    const check=h("input",{type:"checkbox"});check.checked=state.selected.has(session.id);
    check.setAttribute("aria-label","Select "+session.type+" session "+session.id);
    check.addEventListener("change",()=>{if(check.checked)state.selected.add(session.id);else state.selected.delete(session.id);render();});
    const label=h("label",{className:"check-line"},check,h("strong",{text:heading(session.type)}));
    app.append(card(
      label,
      para(new Date(session.createdAt).toLocaleString()+" · "+session.photos.length+" saved photos","muted small"),
      para("Trailer: "+(session.trailer||"—")+" · BOL: "+(session.bol4||"—"),"small"),
      h("div",{className:"stack"},
        button("Open session",()=>nav("session",session.id),SECONDARY),
        button("Delete session",async()=>{
          if(!window.confirm("Delete this saved session and ALL its photos from this iPhone?"))return;
          try{await deleteSessions([session.id]);state.selected.delete(session.id);render();}
          catch(e){fail(e);}
        },"btn danger")
      )
    ));
  }
}
async function renderSession(id) {
  const session=await loadSession(state.sessionID);
  if(id!==state.renderID)return;
  if(!session){app.append(card(title("Session not found"),button("Home",()=>nav("home"),SECONDARY)));return;}
  const photoRecords=await Promise.all(session.photos.map(p=>loadPhoto(p.id)));
  if(id!==state.renderID)return;
  const photoMap=new Map(photoRecords.filter(Boolean).map(p=>[p.id,p]));
  const header=toolbar(heading(session.type));
  const missing=missingPhotos(session);
  const summary=card(
    para("Driver: "+(session.driver||"—")+" · Truck: "+(session.truck||"—"),"small"),
    para("Created: "+new Date(session.createdAt).toLocaleString(),"muted small"),
    para(session.photos.length+" original photo(s) in LoadPix", "muted small")
  );
  const detail=card(
    h("h2",{text:"Load details"}),
    field("Trailer number",session.trailer,async v=>{session.trailer=v.trim().slice(0,60);await saveSession(session);},{maxLength:60}),
    field("Last four of BOL",session.bol4,async v=>{session.bol4=normalizeBOL(v);await saveSession(session);},{maxLength:4,inputMode:"numeric"}),
    field("Load note (optional)",session.note,async v=>{session.note=v.trim().slice(0,160);await saveSession(session);},{multiline:true,maxLength:160}),
    para("These values are saved with this session. Your next load starts with blank trailer/BOL fields.","muted small")
  );
  app.append(header,summary,detail);
  for(const category of CATEGORIES[session.type]){
    const photos=session.photos.filter(p=>p.category===category);
    const box=card(h("h3",{text:(photos.length?"✓ ":"○ ")+category}));
    if(!photos.length)box.append(para("Required photo","muted small"));
    for(const photo of photos){
      const data=photoMap.get(photo.id);
      const picture=h("img");picture.alt="Photo for "+category;
      picture.loading="lazy";if(data?.blob)picture.src=photoURL(data.blob);
      const actions=h("div",{className:"photo-actions"});
      actions.append(
        button("View",()=>viewPhoto(data,photo),"btn secondary inline-btn",!data),
        button("Retake",()=>takePhoto(session.id,category,photo.id),"btn secondary inline-btn"),
        button("Remove",async()=>{
          if(!window.confirm("Remove this photo from LoadPix?"))return;
          try{await removePhoto(session,photo.id);render();}catch(e){fail(e);}
        },"btn ghost inline-btn")
      );
      box.append(h("div",{className:"photo"},picture,actions));
    }
    box.append(button(photos.length?"+ Add another photo":"Take photo",
      ()=>takePhoto(session.id,category,null),SECONDARY,session.photos.length>=20));
    app.append(box);
  }
  const share=card(h("h2",{text:"Share photos to dispatch"}));
  share.append(para("Share opens iPhone's sheet. Choose Messages, check the recipient, text and attached photos, then tap Send. LoadPix cannot confirm delivery.","muted small"));
  if(missing.length) {
    share.append(para("Still needed: "+missing.join(", "),"muted small"));
  } else {
    const batchSize=3;
    const count=batchCount(session,batchSize);
    state.batch=Math.max(0,Math.min(state.batch,count-1));
    const offset=state.batch*batchSize;
    const photos=session.photos.slice(offset,offset+batchSize);
    const rows=photos.map(p=>photoMap.get(p.id)).filter(Boolean);
    const files=rows.map((record,index)=>{
      const ext=record.blob.type==="image/png"?"png":record.blob.type.includes("heic")?"heic":"jpg";
      return new File([record.blob],"LoadPix_"+session.type+"_"+(offset+index+1)+"."+ext,{type:record.blob.type||"image/jpeg"});
    });
    const canFiles=typeof navigator.canShare==="function"&&navigator.canShare({files});
    share.append(
      para("Group "+(state.batch+1)+" of "+count+" · photos "+(offset+1)+"–"+(offset+photos.length),"eyebrow"),
      button("Share this group ("+files.length+" photo"+(files.length===1?"":"s")+")",()=>{
        if(!canFiles){alertStatus("This iPhone/browser cannot share photo files from LoadPix. Use the manual steps below.");return;}
        try{
          const result=navigator.share({files,text:messageBody(session)});
          Promise.resolve(result).then(()=>{
            alertStatus("Handed off to iPhone sharing. Check Messages and confirm dispatch received it; this is NOT a delivery receipt.");
          }).catch(err=>{if(err?.name!=="AbortError")fail(err);});
        }catch(e){fail(e);}
      },PRIMARY,!canFiles || files.length!==photos.length),
      h("div",{className:"columns"},
        button("← Previous group",()=>{state.batch--;render();},SECONDARY,state.batch===0),
        button("Next group →",()=>{state.batch++;render();},SECONDARY,state.batch>=count-1)
      ),
      para("For multiple groups, send each one deliberately. Safari may ignore the text when sharing photos; check the draft and paste the details if missing.","muted small")
    );
  }
  share.append(
    h("hr"),
    h("h3",{text:"Manual fallback"}),
    button("Copy load text",async()=>{
      try{await navigator.clipboard.writeText(messageBody(session));alertStatus("Load text copied. Paste into your dispatch message.");}
      catch{alertStatus("Clipboard unavailable. Select and copy the text displayed below.");}
    },SECONDARY),
    para(messageBody(session),"stat")
  );
  const recipient=normalizePhone(loadProfile().dispatch);
  if(recipient)share.append(button("Open Messages to dispatch (attach photos manually)",
    ()=>{window.location.href="sms:"+encodeURIComponent(recipient);},SECONDARY));
  share.append(para("If the Share button is unsupported, tap View on each photo and save/share it from Safari, then attach the originals in Messages. All sending requires your approval.","muted small"));
  app.append(share,button("Session history",()=>nav("history"),SECONDARY));
}
function takePhoto(sessionID,category,replaceID){
  state.capture={sessionID,category,replaceID};
  inputCamera.value="";
  inputCamera.click();
}
inputCamera.addEventListener("change",async()=>{
  const file=inputCamera.files?.[0],target=state.capture;
  state.capture=null;
  if(!file || !target)return;
  try{
    const session=await loadSession(target.sessionID);
    if(!session)throw new Error("This session was deleted.");
    await savePhoto(session,file,target.category,target.replaceID);
    alertStatus("Photo saved privately on this iPhone.");
    if(state.page==="session"&&state.sessionID===session.id)render();
  }catch(e){fail(e);}
});
function viewPhoto(record,photo) {
  if(!record?.blob){alertStatus("This photo could not be loaded.");return;}
  const url=photoURL(record.blob);
  const overlay=h("div");overlay.style.cssText="position:fixed;inset:0;z-index:300;background:#0a100ded;display:grid;place-items:center;padding:18px;overflow:auto";
  const box=h("div",{className:"stack"});box.style.cssText="width:min(94vw,700px);max-height:92vh;overflow:auto";
  const image=h("img",{className:"preview"});image.src=url;image.alt="Full-size saved load photo";
  const download=h("a",{text:"Save original photo"});download.href=url;download.download=record.filename||photo.filename||"LoadPix-photo.jpg";download.className=SECONDARY;download.style.textDecoration="none";
  const close=()=>{overlay.remove();};
  box.append(button("Close photo",close,PRIMARY),image,download);
  overlay.addEventListener("click",ev=>{if(ev.target===overlay)close();});
  overlay.append(box);document.body.append(overlay);
}
document.getElementById("home-link").addEventListener("click",()=>nav("home"));
window.addEventListener("pageshow",()=>{ /* IndexedDB persists separately from the cached application shell. */ });
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
render().catch(fail);
setTimeout(()=>{
  const splash=document.getElementById("splash");
  splash.classList.add("hidden");
  setTimeout(()=>splash.remove(),220);
},2000);
