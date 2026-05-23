"""
Real-time image quality analysis for crop leaf scans.
Uses OpenCV + PIL for production-grade diagnostics.
"""
import logging
from typing import Dict, Any, List
import numpy as np
import cv2

logger = logging.getLogger(__name__)


class ImageQualityAnalyzer:
    """Analyzes uploaded crop images for scan quality before/after ML inference."""

    # Thresholds tuned for crop leaf photography
    BLUR_THRESHOLD = 100.0        # Laplacian variance below this = blurry
    BRIGHTNESS_LOW = 60.0         # Mean intensity below this = too dark
    BRIGHTNESS_HIGH = 220.0       # Mean intensity above this = overexposed
    CONTRAST_THRESHOLD = 40.0     # Std dev below this = low contrast
    LEAF_COVERAGE_MIN = 0.10      # At least 10% green pixels expected
    SHADOW_THRESHOLD = 0.25       # More than 25% very dark pixels = heavy shadows
    OVEREXPOSURE_THRESHOLD = 0.15 # More than 15% very bright pixels = overexposed
    CENTERING_THRESHOLD = 0.35    # Center of mass deviation from image center

    def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Run full image quality analysis pipeline.
        Returns structured metrics, unified score, and retake suggestions.
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return self._error_result("Could not decode image")

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

            blur_score = self._analyze_blur(gray)
            brightness = self._analyze_brightness(gray)
            contrast = self._analyze_contrast(gray)
            leaf_coverage = self._analyze_leaf_coverage(hsv)
            shadow_ratio = self._analyze_shadows(gray)
            overexposure_ratio = self._analyze_overexposure(gray)
            bg_noise = self._analyze_background_noise(hsv, img)
            centering = self._analyze_centering(hsv, img.shape)

            # Compute individual quality flags (cast to native Python bool)
            is_blurry = bool(blur_score < self.BLUR_THRESHOLD)
            is_dark = bool(brightness < self.BRIGHTNESS_LOW)
            is_overexposed = bool(brightness > self.BRIGHTNESS_HIGH or overexposure_ratio > self.OVEREXPOSURE_THRESHOLD)
            is_low_contrast = bool(contrast < self.CONTRAST_THRESHOLD)
            has_low_coverage = bool(leaf_coverage < self.LEAF_COVERAGE_MIN)
            has_heavy_shadows = bool(shadow_ratio > self.SHADOW_THRESHOLD)
            is_poorly_centered = bool(centering > self.CENTERING_THRESHOLD)

            # Weighted unified score (0-100)
            scores = {
                "sharpness": self._normalize_score(blur_score, 0, 500, invert=False),
                "brightness": self._brightness_score(brightness),
                "contrast": self._normalize_score(contrast, 0, 80, invert=False),
                "leaf_coverage": self._normalize_score(leaf_coverage, 0, 0.6, invert=False),
                "shadow_free": self._normalize_score(shadow_ratio, 0, 0.5, invert=True),
                "exposure": self._normalize_score(overexposure_ratio, 0, 0.3, invert=True),
                "centering": self._normalize_score(centering, 0, 0.6, invert=True),
                "background_clean": self._normalize_score(bg_noise, 0, 0.5, invert=True),
            }

            weights = {
                "sharpness": 0.25,
                "brightness": 0.15,
                "contrast": 0.10,
                "leaf_coverage": 0.15,
                "shadow_free": 0.08,
                "exposure": 0.07,
                "centering": 0.10,
                "background_clean": 0.10,
            }

            unified_score = sum(scores[k] * weights[k] for k in scores)
            unified_score = float(round(min(max(unified_score, 0), 100), 1))

            # Generate retake suggestions
            suggestions = self._generate_suggestions(
                is_blurry, is_dark, is_overexposed, is_low_contrast,
                has_low_coverage, has_heavy_shadows, is_poorly_centered, bg_noise
            )

            return {
                "scan_quality_score": unified_score,
                "quality_grade": self._grade(unified_score),
                "metrics": {
                    "blur_score": float(round(blur_score, 2)),
                    "brightness": float(round(brightness, 2)),
                    "contrast": float(round(contrast, 2)),
                    "leaf_coverage_pct": float(round(leaf_coverage * 100, 1)),
                    "shadow_ratio_pct": float(round(shadow_ratio * 100, 1)),
                    "overexposure_ratio_pct": float(round(overexposure_ratio * 100, 1)),
                    "background_noise_pct": float(round(bg_noise * 100, 1)),
                    "centering_deviation": float(round(centering, 3)),
                },
                "component_scores": {k: float(round(v, 1)) for k, v in scores.items()},
                "flags": {
                    "is_blurry": is_blurry,
                    "is_dark": is_dark,
                    "is_overexposed": is_overexposed,
                    "is_low_contrast": is_low_contrast,
                    "has_low_coverage": has_low_coverage,
                    "has_heavy_shadows": has_heavy_shadows,
                    "is_poorly_centered": is_poorly_centered,
                },
                "retake_suggestions": suggestions,
                "needs_retake": bool(unified_score < 40),
            }

        except Exception as e:
            logger.error(f"Image quality analysis failed: {e}")
            return self._error_result(str(e))

    # ─── Individual Analysis Methods ─────────────────────────────────

    def _analyze_blur(self, gray: np.ndarray) -> float:
        """Laplacian variance — higher means sharper."""
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def _analyze_brightness(self, gray: np.ndarray) -> float:
        """Mean pixel intensity of grayscale image."""
        return float(np.mean(gray))

    def _analyze_contrast(self, gray: np.ndarray) -> float:
        """Standard deviation of grayscale — higher means more contrast."""
        return float(np.std(gray))

    def _analyze_leaf_coverage(self, hsv: np.ndarray) -> float:
        """Estimate green leaf area using HSV color thresholding."""
        # Green hue range for vegetation
        lower_green = np.array([25, 30, 30])
        upper_green = np.array([95, 255, 255])
        mask = cv2.inRange(hsv, lower_green, upper_green)
        green_pixels = np.count_nonzero(mask)
        total_pixels = hsv.shape[0] * hsv.shape[1]
        return green_pixels / total_pixels if total_pixels > 0 else 0.0

    def _analyze_shadows(self, gray: np.ndarray) -> float:
        """Ratio of very dark pixels (intensity < 30)."""
        dark_pixels = np.count_nonzero(gray < 30)
        total = gray.shape[0] * gray.shape[1]
        return dark_pixels / total if total > 0 else 0.0

    def _analyze_overexposure(self, gray: np.ndarray) -> float:
        """Ratio of very bright pixels (intensity > 240)."""
        bright_pixels = np.count_nonzero(gray > 240)
        total = gray.shape[0] * gray.shape[1]
        return bright_pixels / total if total > 0 else 0.0

    def _analyze_background_noise(self, hsv: np.ndarray, img: np.ndarray) -> float:
        """
        Estimate non-leaf background noise.
        Uses inverse of leaf mask + checks for high color variance in non-green areas.
        """
        lower_green = np.array([25, 30, 30])
        upper_green = np.array([95, 255, 255])
        leaf_mask = cv2.inRange(hsv, lower_green, upper_green)

        # Also detect brown/yellow diseased tissue as valid leaf area
        lower_brown = np.array([10, 40, 40])
        upper_brown = np.array([30, 255, 200])
        brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)

        combined_leaf = cv2.bitwise_or(leaf_mask, brown_mask)
        non_leaf_pixels = np.count_nonzero(combined_leaf == 0)
        total = hsv.shape[0] * hsv.shape[1]
        return non_leaf_pixels / total if total > 0 else 1.0

    def _analyze_centering(self, hsv: np.ndarray, shape: tuple) -> float:
        """
        How well-centered the leaf subject is.
        Returns deviation from center (0 = perfectly centered, 1 = far off).
        """
        lower_green = np.array([25, 30, 30])
        upper_green = np.array([95, 255, 255])
        mask = cv2.inRange(hsv, lower_green, upper_green)

        moments = cv2.moments(mask)
        if moments["m00"] == 0:
            return 0.5  # No leaf detected — moderate penalty

        cx = moments["m10"] / moments["m00"]
        cy = moments["m01"] / moments["m00"]

        h, w = shape[:2]
        center_x, center_y = w / 2, h / 2

        # Normalized distance from center
        deviation = np.sqrt(((cx - center_x) / w) ** 2 + ((cy - center_y) / h) ** 2)
        return float(min(deviation, 1.0))

    # ─── Scoring Helpers ─────────────────────────────────────────────

    def _normalize_score(self, value: float, low: float, high: float, invert: bool = False) -> float:
        """Normalize a raw metric to 0-100 scale."""
        if high == low:
            return 50.0
        normalized = (value - low) / (high - low)
        normalized = max(0.0, min(1.0, normalized))
        if invert:
            normalized = 1.0 - normalized
        return normalized * 100

    def _brightness_score(self, brightness: float) -> float:
        """Brightness has an ideal range (not too dark, not too bright)."""
        ideal = 130.0
        deviation = abs(brightness - ideal) / ideal
        return max(0, (1.0 - deviation)) * 100

    def _grade(self, score: float) -> str:
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        elif score >= 40:
            return "fair"
        else:
            return "poor"

    def _generate_suggestions(
        self, is_blurry: bool, is_dark: bool, is_overexposed: bool,
        is_low_contrast: bool, has_low_coverage: bool,
        has_heavy_shadows: bool, is_poorly_centered: bool, bg_noise: float
    ) -> List[str]:
        suggestions = []
        if is_blurry:
            suggestions.append("Image is blurry — hold the camera steady or use autofocus before capturing.")
        if is_dark:
            suggestions.append("Image is too dark — move to a well-lit area or use natural sunlight.")
        if is_overexposed:
            suggestions.append("Image is overexposed — avoid direct harsh light; use diffused lighting.")
        if is_low_contrast:
            suggestions.append("Low contrast detected — ensure the leaf is against a contrasting background.")
        if has_low_coverage:
            suggestions.append("Leaf is not clearly visible — bring the camera closer to the affected leaf.")
        if has_heavy_shadows:
            suggestions.append("Heavy shadows detected — reposition to reduce shadow on the leaf surface.")
        if is_poorly_centered:
            suggestions.append("Leaf is off-center — center the affected area in the camera frame.")
        if bg_noise > 0.6:
            suggestions.append("Too much background clutter — isolate the leaf against a plain surface.")
        return suggestions

    def _error_result(self, message: str) -> Dict[str, Any]:
        return {
            "scan_quality_score": 0,
            "quality_grade": "error",
            "metrics": {},
            "component_scores": {},
            "flags": {},
            "retake_suggestions": [f"Quality analysis failed: {message}"],
            "needs_retake": False,
            "error": message,
        }


image_quality_analyzer = ImageQualityAnalyzer()
