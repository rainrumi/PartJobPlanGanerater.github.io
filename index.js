const STORAGE_KEY = "shift_calendar_app_v5";

const BASE_COLOR = "#e74c3c";
const BASE_HSL = hexToHsl(BASE_COLOR);
const BASE_LUMINANCE = relativeLuminanceFromHex(BASE_COLOR);

const state = loadState();

const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const addTagBtn = document.getElementById("addTagBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const tagListEl = document.getElementById("tagList");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarTitleEl = document.getElementById("calendarTitle");
const calendarGridEl = document.getElementById("calendarGrid");

const jumpYearEl = document.getElementById("jumpYear");
const jumpMonthEl = document.getElementById("jumpMonth");
const jumpBtn = document.getElementById("jumpBtn");

const outputEl = document.getElementById("output");
const copyBtn = document.getElementById("copyBtn");

addTagBtn.addEventListener("click", handleAddTag);

clearSelectionBtn.addEventListener("click", () => {
  state.selectedTagId = null;
  saveState();
  renderAll();
});

prevMonthBtn.addEventListener("click", () => {
  state.currentMonth -= 1;
  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear -= 1;
  }
  saveState();
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  state.currentMonth += 1;
  if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear += 1;
  }
  saveState();
  renderCalendar();
});

jumpBtn.addEventListener("click", () => {
  const selectedYear = Number(jumpYearEl.value);
  const selectedMonth = Number(jumpMonthEl.value);

  if (!selectedYear || !selectedMonth) return;

  state.currentYear = selectedYear;
  state.currentMonth = selectedMonth - 1;
  saveState();
  renderCalendar();
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(outputEl.value);
    alert("コピーしたわよ！");
  } catch {
    alert("コピーに失敗したわ…");
  }
});

function loadState() {
  const today = new Date();
  const defaultState = {
    currentYear: today.getFullYear(),
    currentMonth: today.getMonth(),
    selectedTagId: null,
    nextTagId: 3,
    tags: [
      { id: 1, start: "08:00", end: "13:00", color: generateRandomHueColor() },
      { id: 2, start: "18:00", end: "21:00", color: generateRandomHueColor() }
    ],
    shiftsByDate: {}
  };

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultState;

  try {
    const parsed = JSON.parse(saved);
    return {
      currentYear: parsed.currentYear ?? defaultState.currentYear,
      currentMonth: parsed.currentMonth ?? defaultState.currentMonth,
      selectedTagId: parsed.selectedTagId ?? null,
      nextTagId: parsed.nextTagId ?? defaultState.nextTagId,
      tags: Array.isArray(parsed.tags) ? parsed.tags : defaultState.tags,
      shiftsByDate: parsed.shiftsByDate ?? {}
    };
  } catch {
    return defaultState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function handleAddTag() {
  const start = startTimeInput.value;
  const end = endTimeInput.value;

  if (!start || !end) {
    alert("時間入れなさいよ！");
    return;
  }

  if (start >= end) {
    alert("時間おかしいでしょ！");
    return;
  }

  const exists = state.tags.some(t => t.start === start && t.end === end);
  if (exists) {
    alert("それもうあるわよ！");
    return;
  }

  const newTag = {
    id: state.nextTagId,
    start,
    end,
    color: generateRandomHueColor()
  };

  state.tags.push(newTag);
  state.selectedTagId = newTag.id;
  state.nextTagId++;

  saveState();
  renderAll();
}

function removeTag(tagId) {
  state.tags = state.tags.filter(t => t.id !== tagId);

  for (const key of Object.keys(state.shiftsByDate)) {
    state.shiftsByDate[key] = state.shiftsByDate[key].filter(s => s.tagId !== tagId);
    if (state.shiftsByDate[key].length === 0) delete state.shiftsByDate[key];
  }

  if (state.selectedTagId === tagId) state.selectedTagId = null;

  saveState();
  renderAll();
}

function renderAll() {
  renderTagList();
  renderCalendar();
  renderOutput();
}

function renderTagList() {
  tagListEl.innerHTML = "";

  state.tags.forEach(tag => {
    const chip = document.createElement("div");
    chip.className = "tag-chip";
    if (tag.id === state.selectedTagId) chip.classList.add("selected");
    chip.style.background = tag.color;

    chip.innerHTML = `
      <span>${removeLeadingZero(tag.start)}～${removeLeadingZero(tag.end)}</span>
      <button>削除</button>
    `;

    chip.onclick = () => {
      state.selectedTagId = tag.id;
      saveState();
      renderTagList();
    };

    chip.querySelector("button").onclick = (e) => {
      e.stopPropagation();
      removeTag(tag.id);
    };

    tagListEl.appendChild(chip);
  });
}

function renderCalendar() {
  calendarGridEl.innerHTML = "";

  const weekdays = ["日","月","火","水","木","金","土"];
  weekdays.forEach(d=>{
    const el=document.createElement("div");
    el.className="weekday";
    el.textContent=d;
    calendarGridEl.appendChild(el);
  });

  calendarTitleEl.textContent = `${state.currentYear}年 ${state.currentMonth+1}月`;

  const firstDay=new Date(state.currentYear,state.currentMonth,1);
  const lastDay=new Date(state.currentYear,state.currentMonth+1,0);
  const startWeekday=firstDay.getDay();

  for(let i=0;i<startWeekday;i++){
    const blank=document.createElement("div");
    blank.className="day-cell outside";
    calendarGridEl.appendChild(blank);
  }

  for(let day=1;day<=lastDay.getDate();day++){
    const key=formatDateKey(state.currentYear,state.currentMonth+1,day);
    const shifts=state.shiftsByDate[key]||[];

    const cell=document.createElement("div");
    cell.className="day-cell";
    cell.onclick=()=>handleDateClick(key);

    const num=document.createElement("div");
    num.className="day-number";
    num.textContent=day;
    cell.appendChild(num);

    shifts.forEach(s=>{
      const b=document.createElement("div");
      b.className="shift-badge";
      b.style.background=s.color;
      b.textContent=`${removeLeadingZero(s.start)}～${removeLeadingZero(s.end)}`;
      cell.appendChild(b);
    });

    calendarGridEl.appendChild(cell);
  }

  refreshJumpControls();
}

function handleDateClick(key){
  const tag=state.tags.find(t=>t.id===state.selectedTagId);
  if(!tag){
    alert("タグ選びなさいよ！");
    return;
  }

  if(!state.shiftsByDate[key]) state.shiftsByDate[key]=[];

  const shifts=state.shiftsByDate[key];
  const idx=shifts.findIndex(s=>s.tagId===tag.id);

  if(idx>=0){
    shifts.splice(idx,1);
  }else{
    shifts.push({
      tagId:tag.id,
      start:tag.start,
      end:tag.end,
      color:tag.color
    });
    if(shifts.length>3) shifts.shift();
  }

  if(shifts.length===0) delete state.shiftsByDate[key];

  saveState();
  renderCalendar();
  renderOutput();
}

function renderOutput(){
  const lines=[];
  const keys=Object.keys(state.shiftsByDate).sort();

  keys.forEach(k=>{
    const shifts=[...state.shiftsByDate[k]].sort(compareShiftTime);
    const [,m,d]=k.split("-").map(Number);

    shifts.forEach(s=>{
      lines.push(`${m}/${d} ${removeLeadingZero(s.start)}～${removeLeadingZero(s.end)}`);
    });
  });

  outputEl.value=lines.join("\n");
}

function compareShiftTime(a,b){
  return a.start.localeCompare(b.start)||a.end.localeCompare(b.end);
}

function refreshJumpControls(){
  jumpYearEl.innerHTML="";
  jumpMonthEl.innerHTML="";

  const currentYear=new Date().getFullYear();

  for(let y=currentYear;y<=currentYear+10;y++){
    const o=document.createElement("option");
    o.value=y;
    o.textContent=`${y}年`;
    if(y===state.currentYear) o.selected=true;
    jumpYearEl.appendChild(o);
  }

  for(let m=1;m<=12;m++){
    const o=document.createElement("option");
    o.value=m;
    o.textContent=`${m}月`;
    if(m===state.currentMonth+1) o.selected=true;
    jumpMonthEl.appendChild(o);
  }
}

function formatDateKey(y,m,d){
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function removeLeadingZero(t){
  const [h,m]=t.split(":");
  return `${Number(h)}:${m}`;
}

/* ===== 色処理 ===== */

function hexToRgb(hex){
  const v=hex.replace("#","");
  return{
    r:parseInt(v.slice(0,2),16),
    g:parseInt(v.slice(2,4),16),
    b:parseInt(v.slice(4,6),16)
  };
}

function rgbToHex(r,g,b){
  return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
}

function hexToHsl(hex){
  const {r,g,b}=hexToRgb(hex);
  return rgbToHsl(r,g,b);
}

function rgbToHsl(r,g,b){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b);
  const min=Math.min(r,g,b);
  const d=max-min;

  let h=0,s=0,l=(max+min)/2;

  if(d){
    s=d/(1-Math.abs(2*l-1));
    switch(max){
      case r:h=((g-b)/d)%6;break;
      case g:h=(b-r)/d+2;break;
      case b:h=(r-g)/d+4;break;
    }
    h*=60;
    if(h<0)h+=360;
  }

  return {h,s:s*100,l:l*100};
}

function hslToRgb(h,s,l){
  s/=100;l/=100;
  const c=(1-Math.abs(2*l-1))*s;
  const x=c*(1-Math.abs((h/60)%2-1));
  const m=l-c/2;

  let r=0,g=0,b=0;

  if(h<60){r=c;g=x}
  else if(h<120){r=x;g=c}
  else if(h<180){g=c;b=x}
  else if(h<240){g=x;b=c}
  else if(h<300){r=x;b=c}
  else{r=c;b=x}

  return {
    r:Math.round((r+m)*255),
    g:Math.round((g+m)*255),
    b:Math.round((b+m)*255)
  };
}

function hslToHex(h,s,l){
  const {r,g,b}=hslToRgb(h,s,l);
  return rgbToHex(r,g,b);
}

function srgbToLinear(c){
  c/=255;
  return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
}

function relativeLuminance(r,g,b){
  const R=srgbToLinear(r);
  const G=srgbToLinear(g);
  const B=srgbToLinear(b);
  return 0.2126*R+0.7152*G+0.0722*B;
}

function relativeLuminanceFromHex(hex){
  const {r,g,b}=hexToRgb(hex);
  return relativeLuminance(r,g,b);
}

function luminanceFromHsl(h,s,l){
  const {r,g,b}=hslToRgb(h,s,l);
  return relativeLuminance(r,g,b);
}

function solveLightnessForTargetLuminance(h,s,target){
  let low=0,high=100,best=BASE_HSL.l;

  for(let i=0;i<24;i++){
    const mid=(low+high)/2;
    const lum=luminanceFromHsl(h,s,mid);

    if(Math.abs(lum-target)<Math.abs(luminanceFromHsl(h,s,best)-target)){
      best=mid;
    }

    if(lum<target) low=mid;
    else high=mid;
  }

  return best;
}

function generateRandomHueColor(){
  const hue=Math.floor(Math.random()*360);
  const l=solveLightnessForTargetLuminance(hue,BASE_HSL.s,BASE_LUMINANCE);
  return hslToHex(hue,BASE_HSL.s,l);
}

renderAll();