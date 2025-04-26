document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("header");
  const title = document.getElementById("title");
  const logo = document.getElementById("logo");
  const initialPromptSection = document.getElementById("initialPromptSection");
  const initialPromptInput = document.getElementById("initialPromptInput");
  const submitPromptButton = document.getElementById("submitPromptButton");
  const storyContainer = document.getElementById("storyContainer");
  const narrativeContainer = document.getElementById("narrativeContainer");
  const choicesContainer = document.getElementById("choicesContainer");
  const matrixCanvas = document.getElementById("matrixCanvas");

  submitPromptButton.addEventListener("click", async () => {
    const prompt = initialPromptInput.value.trim();
    if (prompt) {
      title.classList.add("slide-out-top");
      logo.classList.add("logo-move-up");
      initialPromptSection.classList.add("fade-out");
      setTimeout(() => {
        initialPromptSection.remove();
      }, 500);

      await sendStoryUpdate({ type: "start", value: prompt });
    }
  });

  /**
   * Sends a story update (initial prompt, choice, or text input) to the backend.
   * @param {object} payload - The data to send (e.g., { type: 'start', value: '...' })
   */
  async function sendStoryUpdate(payload) {
    if (matrixCanvas && window.startMatrix) {
      matrixCanvas.style.display = "block";
      matrixCanvas.opacity = "0.5";
      window.startMatrix();
    }
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Backend error: ${error.error}`);
      }

      const result = await response.json();

      if (matrixCanvas && window.stopMatrix) {
        matrixCanvas.style.opacity = "0";
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.stopMatrix();
        matrixCanvas.style.display = "none";
      }

      await updateUI(result);
    } catch (error) {
      console.error("Error during story update:", error);

      narrativeContainer.textContent = `Error: ${error.message}`;
      choicesContainer.innerHTML = "";
    }
  }

  /**
   * Updates the UI based on the backend's story response.
   * @param {object} storyData - The JSON response from the backend
   */
  async function updateUI(storyData) {
    choicesContainer.innerHTML = "";
    if (storyData.is_end) {
      await typeText(narrativeContainer, storyData.narrative);

      const endMessage = document.createElement("p");
      endMessage.textContent = "The End. Thank you for playing!";
      choicesContainer.appendChild(endMessage);
    } else if (storyData.narrative) {
      await typeText(narrativeContainer, storyData.narrative);
    }

    if (storyData.input_type === "choices" && storyData.choices) {
      storyData.choices.forEach((choice, idx) => {
        const card = document.createElement("div");
        card.className = "choice-card";
        card.tabIndex = 0;
        card.style.setProperty("--delay", `${idx * 0.1 + 0.2}s`);

        const colors = [
          "#f8f1e5",
          "#f5e8d5",
          "#f3e5c0",
          "#f0e0cc",
          "#ede0d4",
          "#ebd8c3",
        ];

        if (!window.choiceCardColors) {
          window.choiceCardColors = [...colors].sort(() => Math.random() - 0.5);
        }
        const colorIndex = idx % window.choiceCardColors.length;
        card.style.backgroundColor = window.choiceCardColors[colorIndex];

        const text = document.createElement("div");
        text.className = "choice-text";
        text.textContent = choice.text;
        card.dataset.choiceText = choice.text;

        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        });

        card.addEventListener("click", (event) =>
          handleChoiceSelection(event.currentTarget)
        );
        card.addEventListener("keypress", (e) => {
          if (e.key === "Enter" || e.key === " ")
            handleChoiceSelection(e.currentTarget);
        });

        card.append(text);
        choicesContainer.appendChild(card);
      });
    } else if (storyData.input_type === "text" && storyData.input_prompt) {
      const promptText = document.createElement("p");
      promptText.textContent = storyData.input_prompt;
      choicesContainer.appendChild(promptText);
      choicesContainer.style.width = "100%";

      const textInput = document.createElement("textarea");
      textInput.id = "textInput";
      textInput.className = "textField";
      textInput.style.resize = "none";
      choicesContainer.appendChild(textInput);

      const submitTextButton = document.createElement("button");
      submitTextButton.textContent = "Submit";
      submitTextButton.style.float = "right";
      submitTextButton.addEventListener("click", async () => {
        const textValue = textInput.value.trim();
        if (textValue) {
          await sendStoryUpdate({ type: "text", value: textValue });
        }
      });
      choicesContainer.appendChild(submitTextButton);
    } else {
      storyContainer.textContent =
        "Error: Unexpected response from story engine.";
      console.error("Unexpected story data structure:", storyData);
    }
  }

  /**
   * Handles a choice selection, applying animations.
   * @param {HTMLElement} chosenCard - The choice card element that was clicked.
   */
  async function handleChoiceSelection(chosenCard) {
    const choiceText = chosenCard.dataset.choiceText;
    const allChoiceCards = choicesContainer.querySelectorAll(".choice-card");
    const fadeOutDuration = 600;

    allChoiceCards.forEach((card) => {
      card.style.pointerEvents = "none";
      if (card === chosenCard) {
        card.style.zIndex = "10";
        card.classList.add("chosen-exit");
      } else {
        card.classList.add("slide-out-left");

        setTimeout(() => {
          if (card.parentNode === choicesContainer) {
            choicesContainer.removeChild(card);
          }
        }, fadeOutDuration);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    await sendStoryUpdate({ type: "choice", value: choiceText });
  }

  /**
   * Implements a typewriter effect for displaying text.
   * @param {HTMLElement} element - The element to type into.
   * @param {string} text - The text to type.
   * @param {number} speed - Typing speed in milliseconds per character.
   */
  async function typeText(element, text, speed = 30) {
    element.textContent = "";
    console.log("Typing text:", text);
    const cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    cursor.textContent = "|";

    element.appendChild(cursor);

    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      element.insertBefore(document.createTextNode(char), cursor);
      await new Promise((resolve) => setTimeout(resolve, speed));
    }

    if (element.contains(cursor)) {
      element.removeChild(cursor);
    }
  }
});
