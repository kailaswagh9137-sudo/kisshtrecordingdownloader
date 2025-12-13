/* ---------------- OTP LOGIN SYSTEM ---------------- */

const allowedOtps = [
  "112233", "445566", "778899", "991122",
  "246810", "135790", "555555", "909090",
  "121212", "343434", "565656", "787878"
];

let otpRequested = false;
let logoutTimer = null;

function sendOTP() {
    const user = document.getElementById("username").value.trim();
    const error = document.getElementById("loginError");

    error.classList.add("hidden");

    if (user !== "Nikhil.Wagh@kissht.com") {
        error.innerText = "❌ Invalid Email ID";
        error.classList.remove("hidden");
        return;
    }

    otpRequested = true;
    document.getElementById("otpSection").classList.remove("hidden");
}

function verifyOTP() {
    const otp = document.getElementById("otpInput").value.trim();
    const error = document.getElementById("loginError");

    if (!otpRequested) {
        error.innerText = "❌ Request OTP first!";
        error.classList.remove("hidden");
        return;
    }

    if (allowedOtps.includes(otp)) {
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        startAutoLogout();
    } else {
        error.innerText = "❌ Wrong OTP!";
        error.classList.remove("hidden");
    }
}

/* ---------------- AUTO LOGOUT ---------------- */

function startAutoLogout() {
    if (logoutTimer) clearTimeout(logoutTimer);

    logoutTimer = setTimeout(() => {
        alert("Session expired! Logging out.");
        logout();
    }, 32400000); // 9 hours
}

function logout() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");

    document.getElementById("username").value = "";
    document.getElementById("otpInput").value = "";

    otpRequested = false;

    if (logoutTimer) clearTimeout(logoutTimer);
}


/* ------------------------------------------------------
   STRONG DOWNLOADER ENGINE v5
   - Works for auto & manual download
   - Retry system
   - 900ms delay
   - Accurate status
------------------------------------------------------- */

let rows = [];
let headers = [];
let MAX_RETRY = 3;
let DELAY_BETWEEN = 900; // ms delay between downloads

document.getElementById("csvInput")?.addEventListener("change", (e) => {
    Papa.parse(e.target.files[0], {
        skipEmptyLines: true,
        complete: function (results) {

            let data = results.data.filter(r => r.join("").trim() !== "");

            headers = data[0];
            rows = data.slice(1);

            if (!headers.includes("Status")) headers.push("Status");

            document.querySelector("#trackingTable tbody").innerHTML = "";

            // Auto start download
            startQueue();
        }
    });
});

/* ---------------- MANUAL DOWNLOAD BUTTON ---------------- */
document.getElementById("manualDownload")?.addEventListener("click", async () => {
    alert("📥 Manual Download Started!");

    document.querySelector("#trackingTable tbody").innerHTML = "";

    await startQueue();

    alert("🎉 Manual Download Completed!");
});


/* ---------------- DOWNLOAD QUEUE ---------------- */

async function startQueue() {
    for (let i = 0; i < rows.length; i++) {
        await safeDownload(i);
        await delay(DELAY_BETWEEN);
    }

    document.getElementById("downloadCSV").classList.remove("hidden");
}

/* Delay helper */
function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

/* Retry wrapper */
async function safeDownload(index) {
    let attempts = 0;

    while (attempts < MAX_RETRY) {
        let ok = await downloadRow(index, attempts + 1);

        if (ok) return true;

        attempts++;
        await delay(500);
    }

    updateStatus(index, "Failed");
    addTracking(index, rows[index][headers.indexOf("Recording URL")], "❌ Failed", "Max retries exceeded");

    return false;
}

/* ---------------- DOWNLOAD FUNCTION ---------------- */

async function downloadRow(i, attempt) {

    let row = [...rows[i]];

    const urlIdx = headers.indexOf("Recording URL");
    const agentIdx = headers.indexOf("Agent");
    const dateIdx = headers.indexOf("Call Date");

    const url = row[urlIdx];
    let agent = (row[agentIdx] || "Unknown").replace(/[^A-Za-z0-9]/g, "");
    let date = (row[dateIdx] || "NoDate").replace(/[^0-9-]/g, "");

    if (!url || !url.startsWith("http")) {
        updateStatus(i, "Failed");
        addTracking(i, url, "❌ Failed", "Invalid URL");
        return true;
    }

    try {
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
            addTracking(i, url, "⚠ Retry", `Server ${res.status} | Attempt ${attempt}`);
            return false;
        }

        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);

        a.download = `${agent}-${date}.mp3`;
        a.click();

        updateStatus(i, "Downloaded");
        addTracking(i, url, "✅ Downloaded", `Success (Attempt ${attempt})`);

        return true;

    } catch (err) {
        addTracking(i, url, "⚠ Retry", `Network Error | Attempt ${attempt}`);
        return false;
    }
}


/* ---------------- STATUS UPDATE ---------------- */
function updateStatus(i, text) {
    while (rows[i].length < headers.length) rows[i].push("");
    rows[i][headers.length - 1] = text;
}

/* ---------------- TRACKING TABLE ---------------- */
function addTracking(index, url, status, reason) {
    const tbody = document.querySelector("#trackingTable tbody");

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${url}</td>
        <td>${status}</td>
        <td>${reason}</td>
    `;

    tbody.appendChild(tr);
}

/* ---------------- EXPORT UPDATED CSV ---------------- */
document.getElementById("downloadCSV")?.addEventListener("click", () => {
    let final = [headers, ...rows];
    const csv = Papa.unparse(final);

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Updated-CDR.csv";
    a.click();
});
