"""Event classification.

Minimal slice: a deterministic lexicon classifier over the India-scoped event
taxonomy. A pluggable HuggingFace zero-shot path (`mDeBERTa-v3-base-mnli-xnli`)
is implemented behind the optional loader and is only used when
`WEATHER_HF_CLASSIFIER_ENABLED=1` — the heavy model/deps stay out of the base
Docker image, keeping `docker-compose up` a zero-manual-step, lightweight flow.
"""

import re
from functools import lru_cache

from ..config import settings
from ..models import EventType

_WORD_RE = re.compile(r"[a-z]+(?:[\x27-][a-z]+)*")


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall((text or "").lower())


# (event_type, high_confidence_keywords, weak_keywords)
RULES: list[tuple[EventType, tuple[str, ...], tuple[str, ...]]] = [
    (
        EventType.CYCLONE,
        ("cyclone", "cyclonic", "landfall", "tropical storm", "depression over bay"),
        ("bay of bengal", "rough seas", "whirl wind", "wind speed", "storm surge"),
    ),
    (
        EventType.LANDSLIDE,
        ("landslide", "mudslide", "rockfall", "rock fall", "cloudburst"),
        ("hillside", "hill road blocked", "debris", "slope"),
    ),
    (
        EventType.FLOODING,
        ("flood", "flooding", "flooded", "flash flood", "inundat", "waterlogging", "waterlogged"),
        ("overflow", "water level", "embankment", "river at danger", "submerg", "rescue boats", "bv"),  # noqa: E501
    ),
    (
        EventType.DUST_STORM,
        ("dust storm", "dust storm front", "dust wall"),
        ("sand covering", "visibility near zero", "storm in", "sandstorm"),
    ),
    (
        EventType.THUNDERSTORM,
        ("hailstorm", "hail", "thunderstorm", "lightning", "hail stones"),
        ("gusty wind", "sudden rain", "dark clouds"),
    ),
    (
        EventType.FOG_SMOG,
        ("smog", "aqi", "dense fog", "fog", "visibility"),
        ("haze", "pollution level", "air quality", "toxic air"),
    ),
    (
        EventType.DROUGHT,
        ("drought", "dry spell", "monsoon deficiency", "water rationing", "reservoir at"),
        ("water tanker", "wells dry", "kharif crop", "deficit rain"),
    ),
    (
        EventType.HEATWAVE,
        ("heatwave", "heat wave", "scorching heat"),
        ("maximum temperature", "heat exhaustion", "45 degrees", "44 degrees", "orange warning"),
    ),
    (
        EventType.COLD_WAVE,
        ("cold wave", "coldwave", "freez", "minus "),
        ("snow", "low visibility due to cold", "minimum temperature"),
    ),
]

_CONFIDENCE_STRONG_WEIGHTS = {kw: 1.0 for _, strong, _ in RULES for kw in strong}
_CONFIDENCE_WEAK_WEIGHTS = {kw: 0.5 for _, _, weak in RULES for kw in weak}


def classify(text: str) -> tuple[str | None, float]:
    """Returns (event_type, confidence) or (None, 0.0) when uncertain.

    Also consults the optional HF zero-shot classifier when enabled; the
    lexicon result is the baseline so classification never depends on a model
    download.
    """
    tokens = _tokens(text)
    phrase = " ".join(tokens)

    best: tuple[str | None, float] = (None, 0.0)
    for event, strong, weak in RULES:
        score = 0.0
        for kw in strong:
            if kw in tokens or kw in phrase:
                score += _CONFIDENCE_STRONG_WEIGHTS[kw]
        for kw in weak:
            if kw in tokens or kw in phrase:
                score += _CONFIDENCE_WEAK_WEIGHTS[kw]
        if score > 0 and score > best[1]:
            best = (event.value, score)

    if settings.hf_classifier_enabled:
        hf = _hf_zero_shot()
        if hf is not None:
            hf_event, hf_conf = hf(text)
            if hf_conf > best[1]:
                best = (hf_event, hf_conf)

    if best[1] == 0:
        return (None, 0.0)
    return best[0], min(1.0, 0.5 + best[1] * 0.25)


@lru_cache(maxsize=1)
def _hf_zero_shot():
    """Load the mDeBERTa zero-shot classifier lazily. Returns None if the
    optional dependencies are not installed (base image excludes them)."""
    try:
        from transformers import pipeline  # type: ignore

        labels = [e.value for e in EventType]
        clf = pipeline(
            "zero-shot-classification",
            model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
            device=-1,
        )

        def run(text: str) -> tuple[str | None, float]:
            res = clf(text, candidate_labels=labels)
            best_label = res["labels"][0]
            return best_label, float(res["scores"][0])

        return run
    except Exception:
        return None