(function(){
  function pad2(value){
    return String(value).padStart(2,"0");
  }

  function fmt(time){
    if(!time || typeof time !== "string"){
      return "--";
    }

    const parts = time.split(":").map(Number);
    return `${pad2(parts[0])}:${pad2(parts[1])}`;
  }

  function range(period){
    if(!period){
      return "--";
    }

    return `${fmt(period.start)} - ${fmt(period.end)}`;
  }

  function setPlainTime(id, period){
    const node = document.getElementById(id);
    if(!node){
      return;
    }

    node.textContent = range(period);
    node.dir = "ltr";
    node.style.direction = "ltr";
    node.style.unicodeBidi = "isolate";
    node.style.whiteSpace = "nowrap";
  }

  function patchCards(){
    if(typeof getSchedule !== "function"){
      return;
    }

    const schedule = getSchedule();

    setPlainTime("previousTime", schedule.previous);

    if(schedule.current){
      setPlainTime("currentTime", schedule.current);
    }else if(schedule.beforeSchool && schedule.first){
      setPlainTime("currentTime", schedule.first);
    }

    setPlainTime("nextTime", schedule.next);
  }

  function patchTableTimes(){
    document.querySelectorAll(".time-cell").forEach(cell => {
      const start = cell.querySelector(".time-start");
      const end = cell.querySelector(".time-end");

      if(start && end){
        cell.textContent = `${start.textContent.trim()} - ${end.textContent.trim()}`;
        cell.dir = "ltr";
        cell.style.direction = "ltr";
        cell.style.unicodeBidi = "isolate";
        cell.style.whiteSpace = "nowrap";
      }
    });
  }

  function centerTicker(){
    const track = document.getElementById("tickerTrack");
    if(!track){
      return;
    }

    track.style.animation = "none";
    track.style.transform = "none";
    track.style.justifyContent = "center";
    track.style.width = "100%";
  }

  function patch(){
    patchCards();
    patchTableTimes();
    centerTicker();
  }

  window.addEventListener("load", () => {
    patch();
    setInterval(patch, 300);
  });
})();
