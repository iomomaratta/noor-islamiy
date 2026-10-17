const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function safeGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { showToast("التخزين مش متاح في المتصفح ده."); }
}
$("#year").textContent = new Date().getFullYear();

// مظهر فاتح/داكن
const savedTheme = safeGet("noor-theme", "light");
if (savedTheme === "dark") document.body.classList.add("dark");
$("#themeToggle").textContent = document.body.classList.contains("dark") ? "☀" : "☾";
$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const theme = document.body.classList.contains("dark") ? "dark" : "light";
  safeSet("noor-theme", theme);
  $("#themeToggle").textContent = theme === "dark" ? "☀" : "☾";
});

// نسخ النصوص
async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast("النسخ غير متاح هنا. جرّب تشغيل الموقع عبر localhost.");
  }
}
$("#copyVerse").addEventListener("click", () => copyText(
  "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا — سورة الشرح ٥–٦",
  "تم نسخ الآية"
));
const hadiths = [
  {text:"إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ", source:"صحيح البخاري، حديث رقم ١؛ وصحيح مسلم، حديث رقم ١٩٠٧.", explanation:"النية أساس العمل، وبها يُعرف المقصود منه."},
  {text:"بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ", source:"صحيح البخاري، حديث رقم ٨؛ وصحيح مسلم، حديث رقم ١٦.", explanation:"يبيّن الحديث أركان الإسلام الخمسة."},
  {text:"الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ", source:"صحيح البخاري، حديث رقم ١٠؛ وصحيح مسلم، حديث رقم ٤٠.", explanation:"من كمال الإسلام أن يأمن الناس أذى اللسان واليد."},
  {text:"لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ", source:"صحيح البخاري، حديث رقم ١٣؛ وصحيح مسلم، حديث رقم ٤٥.", explanation:"يدعو الحديث إلى محبة الخير للآخرين."},
  {text:"مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ", source:"صحيح البخاري، حديث رقم ٦٠١٨؛ وصحيح مسلم، حديث رقم ٤٧.", explanation:"توجيه لحفظ اللسان واختيار الكلام النافع."},
  {text:"الدِّينُ النَّصِيحَةُ", source:"صحيح مسلم، حديث رقم ٥٥.", explanation:"النصيحة من المعاني العظيمة في الدين، وتكون بإخلاص وصدق."},
  {text:"وَاللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ", source:"صحيح مسلم، حديث رقم ٢٦٩٩.", explanation:"فيه فضل مساعدة الناس وقضاء حوائجهم."}
];
function renderHadith() {
  const hadith = hadiths[Number($("#hadithSelect").value)] || hadiths[0];
  $("#hadithText").textContent = `«${hadith.text}»`;
  $("#hadithSource").textContent = `المصدر: ${hadith.source}`;
  $("#hadithExplanation").textContent = hadith.explanation;
}
$("#hadithSelect").addEventListener("change", renderHadith);
$("#copyHadith").addEventListener("click", () => {
  const hadith = hadiths[Number($("#hadithSelect").value)] || hadiths[0];
  copyText(`${hadith.text} — ${hadith.source}`, "تم نسخ الحديث");
});
renderHadith();

// المصحف الكامل: واجهة AlQuran Cloud (تحتاج إنترنت أول مرة).
const QURAN_API = "https://api.alquran.cloud/v1";
const surahSelect = $("#surahSelect");
const quranVerses = $("#quranVerses");
const quranStatus = $("#quranStatus");
let currentSurah = null;
let currentAyahs = [];
let allSurahs = [];

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("تعذر الاتصال بمصدر القرآن.");
  const payload = await response.json();
  if (payload.code !== 200 || !payload.data) throw new Error("مصدر القرآن لم يرجع بيانات صالحة.");
  return payload.data;
}
function renderAyahs(filterText = "") {
  const query = filterText.trim();
  const filtered = currentAyahs.filter(ayah => !query || ayah.text.includes(query));
  quranVerses.classList.add("verse-list");
  if (!filtered.length) {
    quranVerses.innerHTML = '<p class="muted">مش لاقي الكلمة دي في السورة المفتوحة.</p>';
    return;
  }
  quranVerses.replaceChildren();
  filtered.forEach(ayah => {
    const row = document.createElement("div");
    row.className = "ayah-row";
    const number = document.createElement("span");
    number.className = "ayah-number";
    number.textContent = ayah.numberInSurah;
    const text = document.createElement("span");
    text.className = "ayah-text";
    text.textContent = ayah.text;
    row.append(number, text);
    quranVerses.appendChild(row);
  });
}
async function loadSurah(number) {
  if (!number) return;
  quranStatus.textContent = "جارٍ تحميل السورة…";
  quranVerses.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "لحظات، بنحمّل الآيات.";
  quranVerses.appendChild(loading);
  try {
    const data = await fetchJson(`${QURAN_API}/surah/${number}`);
    currentSurah = data;
    currentAyahs = data.ayahs || [];
    $("#surahMeta").textContent = `${data.name} · ${data.numberOfAyahs} آية · ${data.revelationType === "Meccan" ? "مكية" : "مدنية"}`;
    $("#ayahSearch").value = "";
    renderAyahs();
    quranStatus.textContent = "تم تحميل السورة. ابحث داخلها من مربع البحث، أو اختار سورة أخرى.";
    safeSet("noor-last-reading", {surah: data.number, ayah: 1});
  } catch (error) {
    quranStatus.textContent = "ماقدرناش نحمّل السورة. تأكد من الإنترنت وجرب تاني.";
    quranVerses.replaceChildren();
    const retry = document.createElement("button");
    retry.className = "button primary";
    retry.textContent = "إعادة المحاولة";
    retry.addEventListener("click", () => loadSurah(number));
    quranVerses.appendChild(retry);
  }
}
async function initQuran() {
  try {
    allSurahs = await fetchJson(`${QURAN_API}/surah`);
    surahSelect.replaceChildren();
    allSurahs.forEach(surah => {
      const option = document.createElement("option");
      option.value = surah.number;
      option.textContent = `${surah.number}. ${surah.name} (${surah.numberOfAyahs} آية)`;
      surahSelect.appendChild(option);
    });
    const last = safeGet("noor-last-reading", {surah: 1, ayah: 1});
    const startingSurah = allSurahs.some(s => s.number === last.surah) ? last.surah : 1;
    surahSelect.value = String(startingSurah);
    await loadSurah(startingSurah);
  } catch (error) {
    surahSelect.innerHTML = '<option value="">تعذر تحميل قائمة السور</option>';
    quranStatus.textContent = "تحميل المصحف الكامل يحتاج اتصال إنترنت. افتح الموقع عبر Live Server أو جرّب تحديث الصفحة.";
    quranVerses.replaceChildren();
    const retry = document.createElement("button");
    retry.className = "button primary";
    retry.textContent = "إعادة تحميل المصحف";
    retry.addEventListener("click", initQuran);
    quranVerses.appendChild(retry);
  }
}
surahSelect.addEventListener("change", () => loadSurah(Number(surahSelect.value)));
$("#ayahSearch").addEventListener("input", event => renderAyahs(event.target.value));
$("#saveReading").addEventListener("click", () => {
  if (!currentSurah) { showToast("حمّل سورة الأول."); return; }
  safeSet("noor-last-reading", {surah: currentSurah.number, ayah: 1});
  showToast("تم حفظ السورة الحالية كآخر موضع قراءة.");
});
initQuran();

// أذكار تجريبية مع عداد
const adhkarData = {
  morning: {text:"أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", note:"عينة من أذكار الصباح؛ راجع النص الكامل ومصدره قبل النشر."},
  evening: {text:"أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ", note:"عينة من أذكار المساء؛ راجع النص الكامل ومصدره قبل النشر."},
  general: {text:"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", note:"ذكر مشهور؛ أضف مصدرًا وتخريجًا موثوقًا في النسخة المنشورة."}
};
let activeDhikr = "morning";
let dhikrCount = 0;
$$("[data-adhkar]").forEach(button => button.addEventListener("click", () => {
  activeDhikr = button.dataset.adhkar;
  $$("[data-adhkar]").forEach(item => item.classList.toggle("active", item === button));
  $("#dhikrText").textContent = adhkarData[activeDhikr].text;
  $("#dhikrNote").textContent = adhkarData[activeDhikr].note;
  dhikrCount = 0;
  $("#repCount").textContent = dhikrCount;
}));
$("#repPlus").addEventListener("click", () => { dhikrCount++; $("#repCount").textContent = dhikrCount; });
$("#repMinus").addEventListener("click", () => { dhikrCount = Math.max(0, dhikrCount - 1); $("#repCount").textContent = dhikrCount; });
$("#dhikrDone").addEventListener("click", () => {
  dhikrCount++;
  $("#repCount").textContent = dhikrCount;
  showToast("تقبّل الله منك");
});

// السبحة: تخزين مستقل لكل ذكر
let tasbihCounts = safeGet("noor-tasbih-counts", {});
const tasbihType = $("#tasbihType");
const tasbihCount = $("#tasbihCount");
function currentTasbihKey() { return tasbihType.value; }
function renderTasbih() {
  tasbihCount.textContent = tasbihCounts[currentTasbihKey()] || 0;
  $("#tasbihTargetLabel").textContent = $("#tasbihTarget").value === "0" ? "بدون هدف" : `هدفك: ${$("#tasbihTarget").value}`;
}
tasbihType.addEventListener("change", renderTasbih);
$("#tasbihTarget").addEventListener("change", renderTasbih);
$("#tasbihButton").addEventListener("click", () => {
  const key = currentTasbihKey();
  tasbihCounts[key] = (tasbihCounts[key] || 0) + 1;
  safeSet("noor-tasbih-counts", tasbihCounts);
  renderTasbih();
  const target = Number($("#tasbihTarget").value);
  if (target && tasbihCounts[key] === target) showToast("وصلت للهدف، تقبّل الله منك!");
});
$("#tasbihReset").addEventListener("click", () => {
  tasbihCounts[currentTasbihKey()] = 0;
  safeSet("noor-tasbih-counts", tasbihCounts);
  renderTasbih();
  showToast("تم تصفير عداد الذكر المختار");
});
renderTasbih();

// حفظ قائمة السنن على الجهاز
const sunnahState = safeGet("noor-sunnah-checks", {});
$$("[data-sunnah]").forEach(input => {
  input.checked = Boolean(sunnahState[input.dataset.sunnah]);
  input.addEventListener("change", () => {
    sunnahState[input.dataset.sunnah] = input.checked;
    safeSet("noor-sunnah-checks", sunnahState);
    showToast(input.checked ? "تم تسجيل اختيارك" : "تم إلغاء الاختيار");
  });
});

// حساب اتجاه القبلة، ثم محاولة تدوير السهم بالنسبة لاتجاه الجهاز إن كان مدعومًا.
let qiblaBearing = null;
let deviceHeading = null;
function bearingToKaaba(lat, lon) {
  const kaabaLat = 21.4225 * Math.PI / 180;
  const kaabaLon = 39.8262 * Math.PI / 180;
  const userLat = lat * Math.PI / 180;
  const userLon = lon * Math.PI / 180;
  const deltaLon = kaabaLon - userLon;
  const y = Math.sin(deltaLon);
  const x = Math.cos(userLat) * Math.tan(kaabaLat) - Math.sin(userLat) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function updateCompass() {
  if (qiblaBearing === null) return;
  const relative = deviceHeading === null ? qiblaBearing : (qiblaBearing - deviceHeading + 360) % 360;
  $("#compassNeedle").style.transform = `rotate(${relative}deg)`;
}
function handleOrientation(event) {
  let heading = null;
  if (typeof event.webkitCompassHeading === "number") heading = event.webkitCompassHeading;
  else if (typeof event.alpha === "number") heading = (360 - event.alpha) % 360;
  if (heading !== null) {
    deviceHeading = heading;
    updateCompass();
    $("#qiblaResult").textContent = "تم استقبال اتجاه الجهاز. حرّك الموبايل ببطء بعيدًا عن المعادن والمغناطيس لتحسين المعايرة.";
  }
}
$("#compassPermission").addEventListener("click", async () => {
  if (typeof DeviceOrientationEvent === "undefined") {
    showToast("جهازك أو المتصفح لا يدعم حساس الاتجاه.");
    return;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        $("#qiblaResult").textContent = "لم يتم السماح بحساس الاتجاه.";
        return;
      }
    }
    window.addEventListener("deviceorientation", handleOrientation, true);
    $("#qiblaResult").textContent = "حساس الاتجاه اتفعّل لو جهازك بيدعمه. احسب القبلة الأول لو لسه ماحسبتهاش.";
  } catch {
    $("#qiblaResult").textContent = "تعذر تشغيل حساس الاتجاه. تأكد من إعدادات المتصفح والجهاز.";
  }
});
$("#qiblaButton").addEventListener("click", () => {
  const result = $("#qiblaResult");
  if (!navigator.geolocation) {
    result.textContent = "المتصفح لا يدعم تحديد الموقع. جرّب متصفحًا حديثًا مع HTTPS أو localhost.";
    return;
  }
  result.textContent = "جارٍ طلب الموقع… وافق على الإذن من المتصفح لو حابب.";
  navigator.geolocation.getCurrentPosition(position => {
    const {latitude, longitude} = position.coords;
    qiblaBearing = bearingToKaaba(latitude, longitude);
    updateCompass();
    $("#qiblaHeading").textContent = `اتجاه القبلة: ${qiblaBearing.toFixed(1)}° من الشمال الحقيقي`;
    result.textContent = deviceHeading === null
      ? "اتحسب الاتجاه من موقعك. السهم بالنسبة للشمال؛ فعّل معايرة اتجاه الجهاز لو موبايلك يدعمها."
      : "اتحسب الاتجاه وتم ضبط السهم بالنسبة لاتجاه الجهاز. الدقة تعتمد على حساس البوصلة ومعايرته.";
  }, error => {
    const message = error.code === 1 ? "لم يتم السماح بالموقع. تقدر تسمح به من إعدادات المتصفح." :
      error.code === 2 ? "تعذر تحديد الموقع. جرّب تفعيل خدمات الموقع." :
      "انتهت مهلة تحديد الموقع. جرّب مرة تانية.";
    result.textContent = message;
  }, {enableHighAccuracy:true, timeout:12000, maximumAge:60000});
});
