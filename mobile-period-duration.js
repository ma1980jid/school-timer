(function(){
  if (window.__schoolTimerMobilePeriodDurationLoaded) return;
  window.__schoolTimerMobilePeriodDurationLoaded = true;

  function isMobile(){
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function parseTime(text){
    const match = String(text || '').match(/(\d{1,2})\s*:\s*(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function parseRange(text){
    const parts = String(text || '').split('-');
    if (parts.length < 2) return null;

    const start = parseTime(parts[0]);
    const end = parseTime(parts.slice(1).join('-'));
    if (start === null || end === null) return null;

    let minutes = end - start;
    if (minutes < 0) minutes += 24 * 60;
    return minutes;
  }

  function ensureStyles(){
    if (document.getElementById('mobilePeriodDurationStyles')) return;
    const style = document.createElement('style');
    style.id = 'mobilePeriodDurationStyles';
    style.textContent = `
      @media (max-width: 768px) {
        .schedule-grid .status-cell {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2px !important;
          line-height: 1.05 !important;
        }

        .schedule-grid .period-duration {
          display: block !important;
          margin-top: 1px !important;
          font-size: 0.72em !important;
          font-weight: 900 !important;
          color: #8a6a18 !important;
          white-space: nowrap !important;
        }

        .schedule-grid tr.current-row .period-duration {
          color: #7f1d1d !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceRow(row){
    if (!row || row.dataset.durationEnhanced === '1') return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) return;

    const timeCell = cells[1];
    const statusCell = cells[2];
    const duration = parseRange(timeCell.textContent);
    if (!duration) return;

    let stateText = statusCell.querySelector('.state-text');
    if (!stateText) {
      const currentText = statusCell.textContent.trim();
      statusCell.textContent = '';
      stateText = document.createElement('span');
      stateText.className = 'state-text';
      stateText.textContent = currentText || '--';
      statusCell.appendChild(stateText);
    }

    let durationText = statusCell.querySelector('.period-duration');
    if (!durationText) {
      durationText = document.createElement('span');
      durationText.className = 'period-duration';
      statusCell.appendChild(durationText);
    }

    durationText.textContent = duration + ' د';
    row.dataset.durationEnhanced = '1';
  }

  function apply(){
    if (!isMobile()) return;
    ensureStyles();
    document.querySelectorAll('#scheduleCol1 tr, #scheduleCol2 tr').forEach(enhanceRow);
  }

  function start(){
    apply();
    const target1 = document.getElementById('scheduleCol1');
    const target2 = document.getElementById('scheduleCol2');
    const observer = new MutationObserver(() => {
      requestAnimationFrame(apply);
    });
    if (target1) observer.observe(target1, { childList: true, subtree: true });
    if (target2) observer.observe(target2, { childList: true, subtree: true });
    setTimeout(apply, 500);
    setTimeout(apply, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
