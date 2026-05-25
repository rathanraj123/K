# AgriCosmo-AI V2 Architecture: The Agricultural Operating Platform

This comprehensive implementation plan addresses all 20 advanced features required to evolve AgriCosmo-AI from a diagnostic tool into a fully-fledged agricultural operations platform. Due to the massive scope, the implementation is broken down into logical architectural phases.

---

## Phase 1: Core Intelligence & Telemetry Upgrades
*Focus: Deepening the immediate value of a single scan.*

1.  **Disease Confidence Distribution Graph (Point 13)**: 
    *   **Backend**: Return the full array of probabilities from the TFLite model, not just the top result.
    *   **Frontend**: Render a horizontal bar chart showing the probability distribution (e.g., Blast 71%, Brown Spot 18%).
2.  **Model Uncertainty Intelligence (Point 5)**:
    *   **Backend**: When `confidence < 0.55`, calculate `uncertainty_reasons` (e.g., "Low lighting", "Class ambiguity", "Partial leaf visibility") using image quality heuristics.
3.  **Human Expert Escalation Logic (Point 15)**:
    *   **Backend**: Add an `escalate_to_expert` boolean flag if `severity == "high"` AND `confidence < 65%`.
4.  **Disease Evolution Prediction (Point 2)**:
    *   **Backend**: A new forecasting module calculating `spread_risk_next_7_days`, `expected_infection_growth`, and `intervention_window` based on current severity and weather data.
5.  **"Why This Treatment?" Explanations (Point 12)**:
    *   **LLM Prompting**: Force the Groq LLM to explicitly justify *why* a treatment is recommended based on the live weather context (e.g., "Recommended because fungal spread risk is elevated under current humidity").

---

## Phase 2: Longitudinal Tracking & Workflows
*Focus: Tracking the crop over time and managing operations.*

6.  **AI Treatment Effectiveness Tracking (Point 3)**:
    *   **Database**: New `TreatmentTrack` table.
    *   **Frontend**: A dashboard widget for farmers to log applied treatments and recovery percentage.
7.  **Action Timeline (Point 19)**:
    *   **Frontend/LLM**: Generate a structured workflow timeline (Today: Apply fungicide, 2 Days: Check lesions, 7 Days: Follow-up scan).
8.  **AI Scan Comparison (Point 11)**:
    *   **Backend**: A new endpoint `POST /api/v1/detection/compare` taking two image IDs (Before/After), calculating severity reduction, and generating a progression analysis report.
9.  **Smart Case Management System (Point 7)**:
    *   **Database/UI**: For scans escalated to experts, generate a `Case ID`, status (Under Review), assigned expert, and urgency level. Transform the admin panel into a ticketing system.

---

## Phase 3: Macro Intelligence & Environmental Context
*Focus: Zooming out from the leaf to the farm and the region.*

10. **Crop Lifecycle Intelligence (Point 1)**:
    *   **Frontend**: Allow users to select the current crop stage (Seedling, Vegetative, Tillering, Flowering, Ripening).
    *   **Backend**: Adjust disease risks and treatments dynamically based on the selected stage.
11. **Seasonal Intelligence (Point 16)**:
    *   **Backend**: Integrate monsoon, seasonal, and regional planting cycle rules into the LLM prompt and risk calculations.
12. **Disease Outbreak Intelligence (Point 8)**:
    *   **Analytics**: Aggregate geolocation, scan history, and weather. If a specific disease crosses a density threshold in a district, trigger an "Outbreak Alert".
13. **Notification Intelligence (Point 17)**:
    *   **Backend**: Push smart notifications (e.g., "High humidity detected. Blast spread risk increased by 28%").

---

## Phase 4: AI Orchestration & RAG Enhancements
*Focus: Managing backend complexity and improving chat.*

14. **AI Orchestration Layer (Point 18 - Architectural Imperative)**:
    *   **Backend Refactor**: Break down `service.py` into an `Orchestrator` that coordinates dedicated, decoupled engines: `KB Engine`, `Weather Engine`, `Severity Engine`, `Chat Engine`, `Recommendation Engine`.
15. **Expert Chat Role Separation (Point 6)**:
    *   **LLM/UI**: Add a toggle in the chat interface for AI personas: `Farmer AI` (simple), `Agronomist AI` (technical), `Research AI` (scientific). Adjust system prompts accordingly.
16. **AI Memory Layer (Point 14)**:
    *   **RAG Improvement**: Query Elasticsearch not just for chat history, but for the farmer's *entire historical scan record*, allowing the AI to say, "This is the third fungal outbreak detected this season."
17. **Semantic Disease Search (Point 10)**:
    *   **Backend**: A new endpoint `/api/v1/search` where users can type symptoms ("yellow patches with curling") and Elasticsearch retrieves likely diseases and similar cases.

---

## Phase 5: Infrastructure & Deep Learning Roadmaps
*Focus: Reliability and Model Improvements.*

18. **Improve Offline Queue Architecture (Point 9)**:
    *   **Frontend**: Migrate `useAppStore.ts` offline queue storage from `localStorage` to `IndexedDB` (using `idb` or localforage) to handle larger image payloads and prevent browser quota crashes.
19. **Explainability System Roadmap (Point 4)**:
    *   **ML Pipeline**: While keeping OpenCV saliency for now, begin architecting an ONNX-compatible lightweight Grad-CAM pipeline for true pixel-level feature attribution.
20. **Dataset Realism (Point 20)**:
    *   **Data Strategy**: Initiate a data collection/augmentation strategy focusing heavily on partial leaves, extreme lighting, motion blur, and noisy backgrounds to harden the TFLite model.

---

## Next Steps for Execution

To prevent architectural collapse, we must build this incrementally. 

**I propose we start immediately with Phase 1 & Phase 2:**
1.  Refactor the inference endpoint to return full probability distributions and calculate uncertainty reasons/escalation flags.
2.  Implement the forecasting logic (Disease Evolution).
3.  Add the `TreatmentTrack` database tables and the Action Timeline generation.
4.  Update the Frontend UI to display these new intelligence widgets.

*Does starting with Phase 1 and Phase 2 sound like the right approach, or would you prefer to prioritize specific features like the Orchestrator (Phase 4) first?*
