(function(){
  if (window.__activityNoRedistributeLoaded) return;
  window.__activityNoRedistributeLoaded = true;

  function toMinutes(time){
    const parts = String(time || '').split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  function pad(value){
    return String(value).padStart(2, '0');
  }

  function toTime(minutes){
    minutes = (minutes % 1440 + 1440) % 1440;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }

  function typeOfName(name){
    if (String(name).includes('فسحة')) return 'break';
    if (String(name).includes('صلاة')) return 'prayer';
    if (String(name).includes('نشاط')) return 'activity';
    return 'normal';
  }

  function getActivityDuration(kind){
    if (kind === 'oneShift') return 40;
    if (kind === 'twoEvening') return 30;
    return 30;
  }

  function buildRowsWithoutRedistribution(rows, position, kind){
    const result = rows.map((row) => [row[0], row[1], row[2]]);
    const activityDuration = getActivityDuration(kind);

    let insertIndex = 1;
    if (position === 'afterBreak') {
      const breakIndex = result.findIndex((row) => typeOfName(row[0]) === 'break');
      insertIndex = breakIndex >= 0 ? breakIndex + 1 : 1;
    }

    const previous = result[insertIndex - 1] || result[0];
    const start = previous ? previous[2] : result[0][1];
    const end = toTime(toMinutes(start) + activityDuration);

    result.splice(insertIndex, 0, ['النشاط', start, end]);

    for (let i = insertIndex + 1; i < result.length; i++) {
      const duration = Math.max(1, toMinutes(result[i][2]) - toMinutes(result[i][1]));
      const newStart = result[i - 1][2];
      const newEnd = toTime(toMinutes(newStart) + duration);
      result[i][1] = newStart;
      result[i][2] = newEnd;
    }

    return result;
  }

  try {
    buildActivityRows = buildRowsWithoutRedistribution;
    if (typeof lastTableSignature !== 'undefined') lastTableSignature = '';
    if (typeof tick === 'function') tick();
  } catch (error) {
    window.buildActivityRows = buildRowsWithoutRedistribution;
  }
})();
