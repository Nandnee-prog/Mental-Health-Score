// ---------- Config ----------
const API_URL = "hhttps://mental-health-score-6atc.onrender.com";
const DIAL_CIRCUMFERENCE = 2 * Math.PI * 60; // matches the SVG circle r=60

// ---------- Elements ----------
const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const btnSpinner = submitBtn.querySelector(".btn-spinner");
const formError = document.getElementById("form-error");

const resultEmpty = document.getElementById("result-empty");
const resultContent = document.getElementById("result-content");
const dialFill = document.getElementById("dial-fill");
const scoreNumber = document.getElementById("score-number");
const resultTag = document.getElementById("result-tag");
const resultNote = document.getElementById("result-note");
const resetBtn = document.getElementById("reset-btn");

// ---------- Helpers ----------

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnSpinner.hidden = !isLoading;
  btnLabel.textContent = isLoading ? "Calculating..." : "Get my score";
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearFormError() {
  formError.hidden = true;
  formError.textContent = "";
}

function buildPayload(formData) {
  return {
    age: parseInt(formData.get("age"), 10),
    gender: formData.get("gender"),
    country: formData.get("country").trim(),
    academic_level: formData.get("academic_level"),
    most_used_platform: formData.get("most_used_platform"),
    purpose_of_use: formData.get("purpose_of_use"),
    avg_daily_usage_hours: parseFloat(formData.get("avg_daily_usage_hours")),
    daily_unlocks: parseInt(formData.get("daily_unlocks"), 10),
    study_hours: parseFloat(formData.get("study_hours")),
    physical_activity_hours: parseFloat(formData.get("physical_activity_hours")),
    sleep_hours_per_night: parseFloat(formData.get("sleep_hours_per_night")),
    stress_level: formData.get("stress_level"),
  };
}

// Translate the raw score into a friendly tag + note.
// Assumes a 0-10 style scale, which is typical for this kind of model;
// the dial simply clamps to that range for the visual fill.
function describeScore(score) {
  if (score >= 8) {
    return {
      tag: "Thriving",
      note: "Your habits look well balanced right now. Keep it up.",
      color: "#2F6F62",
    };
  }
  if (score >= 6) {
    return {
      tag: "Doing okay",
      note: "Mostly steady, with some room to protect your downtime.",
      color: "#4E8C6E",
    };
  }
  if (score >= 4) {
    return {
      tag: "Under some strain",
      note: "Sleep, activity, or screen time may be pulling on you.",
      color: "#C98A3E",
    };
  }
  return {
    tag: "Needs attention",
    note: "Consider easing screen time and prioritising rest and support.",
    color: "#A9432F",
  };
}

function renderResult(score) {
  resultEmpty.hidden = true;
  resultContent.hidden = false;

  const clamped = Math.max(0, Math.min(10, score));
  const fillRatio = clamped / 10;
  const offset = DIAL_CIRCUMFERENCE * (1 - fillRatio);

  scoreNumber.textContent = score.toFixed(2);

  const { tag, note, color } = describeScore(score);
  resultTag.textContent = tag;
  resultNote.textContent = note;
  dialFill.style.stroke = color;

  // Trigger the dial animation on the next frame
  dialFill.style.strokeDashoffset = DIAL_CIRCUMFERENCE;
  requestAnimationFrame(() => {
    dialFill.style.strokeDashoffset = offset;
  });
}

function resetResult() {
  resultContent.hidden = true;
  resultEmpty.hidden = false;
  dialFill.style.strokeDashoffset = DIAL_CIRCUMFERENCE;
}

async function submitPrediction(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detailMessage = `Request failed with status ${response.status}.`;
    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.detail) {
        detailMessage = Array.isArray(errorBody.detail)
          ? errorBody.detail.map((d) => d.msg || JSON.stringify(d)).join(" · ")
          : String(errorBody.detail);
      }
    } catch (_) {
      // response body wasn't JSON, keep the generic message
    }
    throw new Error(detailMessage);
  }

  return response.json();
}

// ---------- Event wiring ----------

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormError();

  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  const payload = buildPayload(formData);

  setLoading(true);
  try {
    const data = await submitPrediction(payload);
    renderResult(data.predicted_mental_health_score);
  } catch (err) {
    const isNetworkError = err instanceof TypeError;
    showFormError(
      isNetworkError
        ? "Couldn't reach the backend. Make sure it's running at http://127.0.0.1:2200."
        : err.message
    );
  } finally {
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  resetResult();
});
