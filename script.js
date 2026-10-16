const API_URL = "http://127.0.0.1:5000/predict";

document.addEventListener("DOMContentLoaded", function () {
  const uploadBtn = document.getElementById("uploadBtn");
  const imageInput = document.getElementById("imageInput");
  const cameraBtn = document.getElementById("cameraBtn");
  const cameraArea = document.getElementById("cameraArea");
  const cameraVideo = document.getElementById("cameraVideo");
  const captureBtn = document.getElementById("captureBtn");
  const closeCameraBtn = document.getElementById("closeCameraBtn");
  const dropZone = document.getElementById("dropZone");
  const previewContainer = document.getElementById("previewContainer");
  const imagePreview = document.getElementById("imagePreview");
  const fileName = document.getElementById("fileName");
  const removeBtn = document.getElementById("removeBtn");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const status = document.getElementById("status");
  const emptyResult = document.getElementById("emptyResult");
  const result = document.getElementById("result");
  const resultTitle = document.getElementById("resultTitle");
  const resultText = document.getElementById("resultText");

  let selectedFile = null;
  let cameraStream = null;

  // Waste information for the 12 model categories
  const wasteInfo = {
    battery: {
      category: "Hazardous Waste, E-waste collection",
       bin: "Red bin -Dedicated battery collection box",
      advice:
        "Do not put batteries in regular household waste. Take them to an approved battery collection point."
    },
    biological: {
      category: "Biodegradable Waste",
      bin: "Green / wet-waste bin",
      advice:
        "Suitable food and organic waste can usually be composted or placed in an organic-waste bin."
    },
    "brown-glass": {
      category: "Recyclable Waste",
      bin: "Glass recycling",
      advice:
        "Keep glass separate and take it to an accepted glass recycling collection point."
    },
    cardboard: {
      category: "Recyclable Waste",
      bin: "Blue bin - Paper and cardboard recycling",
      advice:
        "Keep cardboard clean and dry, flatten it, and place it in the paper recycling bin."
    },
    clothes: {
      category: "Reusable / Recyclable Waste",
      bin: "Textile collection or donation",
      advice:
        "Donate wearable clothes or look for a textile collection or recycling point."
    },
    "green-glass": {
      category: "Recyclable Waste",
      bin: "Glass recycling",
      advice:
        "Keep glass separate and take it to an accepted glass recycling collection point."
    },
    metal: {
      category: "Recyclable Waste",
      bin: "Blue bin - Metal recycling",
      advice:
        "Separate metal items and place them in a suitable recycling collection bin."
    },
    paper: {
      category: "Recyclable Waste",
      bin: "Blue bin - Paper and cardboard recycling",
      advice:
        "Keep paper clean and dry before placing it in the paper recycling bin."
    },
    plastic: {
      category: "Potentially Recyclable Waste",
      bin: "Blue bin - Plastic recycling",
      advice:
        "Check the plastic type and local recycling rules. Not every type of plastic is recyclable."
    },
    shoes: {
      category: "Reusable / General Disposal",
      bin: "Textile collection or donation",
      advice:
        "Donate usable shoes. If they cannot be reused, check whether a local textile collection accepts them."
    },
    trash: {
      category: "General Disposal",
      bin: "Black bin - General waste bin",
      advice:
        "Use the general waste bin if the item cannot be reused, recycled, or composted."
    },
    "white-glass": {
      category: "Recyclable Waste",
      bin: "Glass recycling",
      advice:
        "Keep glass separate and take it to an accepted glass recycling collection point."
    }
  };

  // Make a category name easier to read
  function formatWasteName(name) {
    return String(name || "Unknown")
      .replace(/-/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  // Open image picker
  uploadBtn.addEventListener("click", function () {
    imageInput.click();
  });

  // Select an image
  imageInput.addEventListener("change", function () {
    if (imageInput.files.length > 0) {
      showImage(imageInput.files[0]);
    }
  });

  // Preview a selected image
  function showImage(file) {
    if (!file || !file.type.startsWith("image/")) {
      status.textContent = "Please select a valid image.";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      status.textContent = "Image must be smaller than 10 MB.";
      return;
    }

    const imageURL = URL.createObjectURL(file);
    const testImage = new Image();

    testImage.onload = function () {
      if (imagePreview.dataset.url) {
        URL.revokeObjectURL(imagePreview.dataset.url);
      }

      selectedFile = file;
      imagePreview.src = imageURL;
      imagePreview.dataset.url = imageURL;
      fileName.textContent = file.name;

      previewContainer.hidden = false;
      analyzeBtn.disabled = false;
      status.textContent = "Image selected successfully! Click Analyze Waste.";
      result.hidden = true;
      emptyResult.hidden = true;

      closeCamera();
    };

    testImage.onerror = function () {
      URL.revokeObjectURL(imageURL);
      status.textContent = "Unable to open this image. Please try another.";
    };

    testImage.src = imageURL;
  }

  // Drag and drop
  dropZone.addEventListener("dragover", function (event) {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("dragging");
  });

  dropZone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropZone.classList.remove("dragging");

    const file = event.dataTransfer.files[0];

    if (file) {
      showImage(file);
    }
  });

  // Open camera
  cameraBtn.addEventListener("click", async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent =
        "Camera requires localhost or a secure HTTPS website.";
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });

      cameraVideo.srcObject = cameraStream;
      cameraArea.hidden = false;

      await cameraVideo.play();

      status.textContent = "Camera ready. Capture your photo.";
    } catch (error) {
      console.error("Camera error:", error);

      closeCamera();

      status.textContent =
        "Camera unavailable. Please allow camera permission or upload an image.";
    }
  });

  // Capture camera photo
  captureBtn.addEventListener("click", function () {
    if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
      status.textContent = "Please wait for the camera to start.";
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(cameraVideo, 0, 0);

    canvas.toBlob(
      function (blob) {
        if (blob) {
          const photo = new File([blob], "waste-photo.jpg", {
            type: "image/jpeg"
          });

          showImage(photo);
        } else {
          status.textContent = "Could not capture the photo. Try again.";
        }
      },
      "image/jpeg",
      0.92
    );
  });

  // Stop camera
  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) {
        track.stop();
      });

      cameraStream = null;
    }

    cameraVideo.srcObject = null;
    cameraArea.hidden = true;
  }

  closeCameraBtn.addEventListener("click", closeCamera);

  // Remove selected image
  removeBtn.addEventListener("click", function () {
    selectedFile = null;
    imageInput.value = "";

    if (imagePreview.dataset.url) {
      URL.revokeObjectURL(imagePreview.dataset.url);
      delete imagePreview.dataset.url;
    }

    imagePreview.removeAttribute("src");
    previewContainer.hidden = true;
    analyzeBtn.disabled = true;

    result.hidden = true;
    emptyResult.hidden = false;

    status.textContent = "Choose an image to begin.";
  });

  // ACTUAL AI ANALYSIS THROUGH PYTHON / FLASK
  analyzeBtn.addEventListener("click", async function () {
    if (!selectedFile) {
      status.textContent = "Please select an image first.";
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    analyzeBtn.disabled = true;
    status.textContent = "Analyzing your image with AI...";

    result.hidden = true;
    emptyResult.hidden = false;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The backend returned an invalid response. Check the Flask terminal."
        );
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || "AI analysis failed.");
      }

      if (!data.category) {
        throw new Error("The AI response did not contain a waste category.");
      }

      displayResult(data);

      status.textContent = "AI analysis completed successfully!";
    } catch (error) {
      console.error("AI analysis error:", error);

      result.hidden = true;
      emptyResult.hidden = false;

      status.textContent =
        "Could not analyze the image. Check that your Python backend is running.";

      resultTitle.textContent = "Analysis Failed";
      resultText.textContent =
        error.message +
        " Make sure Flask is running at http://127.0.0.1:5000.";

      result.hidden = false;
      emptyResult.hidden = true;
    } finally {
      analyzeBtn.disabled = !selectedFile;
    }
  });

  // Display the AI prediction
  function displayResult(data) {
    const predictedWaste = String(data.category).toLowerCase().trim();
    const info = wasteInfo[predictedWaste];

    const wasteName = formatWasteName(predictedWaste);
    const category = info ? info.category : "Category needs verification";

    const confidenceValue = Number(data.confidence);
    const confidenceText = Number.isFinite(confidenceValue)
      ? confidenceValue.toFixed(2) + "%"
      : "Not provided";

    const advice = info
      ? info.advice
      : "Check local waste disposal guidance before disposing of this item.";

    resultTitle.textContent = "Detected Waste: " + wasteName;

    resultText.textContent =
      "Waste type: " + wasteName +
      "\nDisposal category: " + category +
      "\nWhich bin to use: " + info.bin +
      "\nAI confidence: " + confidenceText +
      "\nDisposal advice: " + advice;

    result.hidden = false;
    emptyResult.hidden = true;
  }

  // Stop camera when leaving the page
  window.addEventListener("beforeunload", closeCamera);
});
