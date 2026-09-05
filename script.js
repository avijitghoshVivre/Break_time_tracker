document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const currentLoggedHoursEl = document.getElementById('currentLoggedHours');
  const currentLoggedMinsEl = document.getElementById('currentLoggedMins');
  const currentTimeInputEl = document.getElementById('currentTimeInput');
  const useRealTimeBtn = document.getElementById('useRealTimeBtn');
  const checkoutTimeInputEl = document.getElementById('checkoutTimeInput');
  const requiredHoursInputEl = document.getElementById('requiredHoursInput');

  const statusBadgeEl = document.getElementById('statusBadge');
  const remainingBreakValEl = document.getElementById('remainingBreakVal');
  const remainingBreakLabelEl = document.getElementById('remainingBreakLabel');
  const progressBarFillEl = document.getElementById('progressBarFill');
  const progressPercentEl = document.getElementById('progressPercent');

  const workRemainingValEl = document.getElementById('workRemainingVal');
  const timeLeftCheckoutValEl = document.getElementById('timeLeftCheckoutVal');
  const completionTimeValEl = document.getElementById('completionTimeVal');
  const recommendationBannerEl = document.getElementById('recommendationBanner');

  let isManualTimeOverride = false;

  // Initialize Clock Input to actual system time
  function setClockToNow() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    currentTimeInputEl.value = `${hrs}:${mins}`;
    isManualTimeOverride = false;
    calculate();
  }

  // Format Helper: Minutes to "X hrs Y mins" or "Y mins"
  function formatMins(totalMins) {
    const isNegative = totalMins < 0;
    const absMins = Math.abs(totalMins);
    const h = Math.floor(absMins / 60);
    const m = absMins % 60;

    let res = '';
    if (h > 0) res += `${h} hr${h > 1 ? 's' : ''} `;
    if (m > 0 || h === 0) res += `${m} min${m !== 1 ? 's' : ''}`;
    
    return isNegative ? `-${res.trim()}` : res.trim();
  }

  // Format Helper: Minutes from Midnight to 12-hour AM/PM Time String
  function formatMinutesToTime(minsFromMidnight) {
    // Handle wrap around next day if needed
    let normalized = minsFromMidnight % (24 * 60);
    if (normalized < 0) normalized += 24 * 60;

    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = String(minutes).padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${period}`;
  }

  // Parse HH:MM time string to minutes from midnight
  function timeStringToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  // Core Calculation Function
  function calculate() {
    const loggedHours = parseInt(currentLoggedHoursEl.value) || 0;
    const loggedMins = parseInt(currentLoggedMinsEl.value) || 0;
    const totalLoggedMins = loggedHours * 60 + loggedMins;

    const requiredHours = parseFloat(requiredHoursInputEl.value) || 8;
    const totalRequiredMins = Math.round(requiredHours * 60);

    const currentTimeMins = timeStringToMinutes(currentTimeInputEl.value);
    const checkoutTimeMins = timeStringToMinutes(checkoutTimeInputEl.value);

    // 1. Work remaining
    const workRemainingMins = Math.max(0, totalRequiredMins - totalLoggedMins);
    workRemainingValEl.textContent = formatMins(workRemainingMins);

    // 2. Time left till checkout
    const timeLeftTillCheckoutMins = checkoutTimeMins - currentTimeMins;
    if (timeLeftTillCheckoutMins >= 0) {
      timeLeftCheckoutValEl.textContent = formatMins(timeLeftTillCheckoutMins);
    } else {
      timeLeftCheckoutValEl.textContent = `${formatMins(Math.abs(timeLeftTillCheckoutMins))} past checkout`;
    }

    // 3. Earliest Completion Time (if no further breaks taken)
    const earliestCompletionMins = currentTimeMins + workRemainingMins;
    completionTimeValEl.textContent = formatMinutesToTime(earliestCompletionMins);

    // 4. Remaining Break available before checkout time
    const remainingBreakMins = timeLeftTillCheckoutMins - workRemainingMins;

    // 5. Progress Percentage
    const progressPct = Math.min(100, Math.round((totalLoggedMins / totalRequiredMins) * 100));
    progressBarFillEl.style.width = `${progressPct}%`;
    progressPercentEl.textContent = `${progressPct}%`;

    // 6. Badge & Banner Messaging
    const formattedCheckoutTime = formatMinutesToTime(checkoutTimeMins);

    if (totalLoggedMins >= totalRequiredMins) {
      // Completed Goal
      statusBadgeEl.className = 'result-badge badge-green';
      statusBadgeEl.textContent = '🎉 Goal Completed';
      remainingBreakValEl.textContent = '0 mins';
      remainingBreakLabelEl.textContent = 'Required login hours completed!';
      recommendationBannerEl.style.borderColor = 'var(--accent-green)';
      recommendationBannerEl.style.background = 'rgba(34, 197, 94, 0.1)';
      recommendationBannerEl.innerHTML = `✅ Aapka <b>${requiredHours} hours</b> login target already complete ho gaya hai! Aap abhi checkout kar sakte hain.`;
    } else if (remainingBreakMins > 0) {
      // Positive break remaining
      statusBadgeEl.className = 'result-badge badge-green';
      statusBadgeEl.textContent = '✅ Break Available';
      remainingBreakValEl.textContent = formatMins(remainingBreakMins);
      remainingBreakLabelEl.textContent = `Remaining break buffer left before ${formattedCheckoutTime}`;
      recommendationBannerEl.style.borderColor = 'var(--accent-green)';
      recommendationBannerEl.style.background = 'rgba(34, 197, 94, 0.1)';
      recommendationBannerEl.innerHTML = `🟢 Aap abhi <b>${formatMins(remainingBreakMins)}</b> ka break le sakte hain. Iske baad bhi aapka 8 hours login <b>${formattedCheckoutTime}</b> tak exact complete ho jayega.`;
    } else if (remainingBreakMins === 0) {
      // Exactly on track
      statusBadgeEl.className = 'result-badge badge-amber';
      statusBadgeEl.textContent = '⚡ On Exact Track';
      remainingBreakValEl.textContent = '0 mins';
      remainingBreakLabelEl.textContent = `No break left if checking out at ${formattedCheckoutTime}`;
      recommendationBannerEl.style.borderColor = 'var(--accent-amber)';
      recommendationBannerEl.style.background = 'rgba(245, 158, 11, 0.1)';
      recommendationBannerEl.innerHTML = `🟠 Aap exact on track hain. <b>${formattedCheckoutTime}</b> tak 8 hours complete karne ke liye abhi se continuously logged in rehna padega (no more breaks).`;
    } else {
      // Negative break remaining (shortage)
      const shortageMins = Math.abs(remainingBreakMins);
      statusBadgeEl.className = 'result-badge badge-red';
      statusBadgeEl.textContent = '⚠️ Shortage Warning';
      remainingBreakValEl.textContent = `-${formatMins(shortageMins)}`;
      remainingBreakLabelEl.textContent = `Time short for ${formattedCheckoutTime} checkout`;
      recommendationBannerEl.style.borderColor = 'var(--accent-red)';
      recommendationBannerEl.style.background = 'rgba(239, 68, 68, 0.1)';
      recommendationBannerEl.innerHTML = `🔴 <b>${formattedCheckoutTime}</b> tak aapka 8 hours complete nahi hoga (${formatMins(shortageMins)} short). 8 hours pure karne ke liye aapko <b>${formatMinutesToTime(earliestCompletionMins)}</b> tak rukna padega.`;
    }
  }

  // Event Listeners
  currentLoggedHoursEl.addEventListener('input', calculate);
  currentLoggedMinsEl.addEventListener('input', calculate);
  checkoutTimeInputEl.addEventListener('input', calculate);
  requiredHoursInputEl.addEventListener('input', calculate);

  currentTimeInputEl.addEventListener('input', () => {
    isManualTimeOverride = true;
    calculate();
  });

  useRealTimeBtn.addEventListener('click', () => {
    setClockToNow();
  });

  // Auto update real-time clock every minute if not manually overridden
  setInterval(() => {
    if (!isManualTimeOverride) {
      setClockToNow();
    }
  }, 60000);

  // Initial call
  setClockToNow();
});
