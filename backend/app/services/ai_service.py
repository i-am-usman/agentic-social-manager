


import logging
import base64
import os
import json
import re
from bytez import Bytez
from google import genai
from app.config import config

try:
    from groq import Groq
except Exception:  # pragma: no cover - optional dependency fallback
    Groq = None

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
BYTEZ_API_KEY = os.getenv("BYTEZ_API_KEY")
BYTEZ_MODEL = os.getenv("BYTEZ_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


class AIService:
    """AI generation using Gemini (text) + Bytez (images)"""

    @staticmethod
    def _extract_json_object(raw_text: str) -> dict:
        """Extract a JSON object from model output, including fenced blocks."""
        if not raw_text:
            return {}

        text = raw_text.strip()

        # Handle fenced JSON blocks first.
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
        if fenced:
            text = fenced.group(1).strip()

        # Try direct parse.
        try:
            parsed = json.loads(text)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass

        # Fallback: parse first object-like section.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end + 1]
            try:
                parsed = json.loads(candidate)
                return parsed if isinstance(parsed, dict) else {}
            except Exception:
                return {}

        return {}

    @staticmethod
    def _normalize_analysis_payload(parsed: dict, model_name: str) -> dict:
        sentiment = str(parsed.get("sentiment", "neutral")).strip().lower()
        if sentiment not in {"positive", "neutral", "negative"}:
            sentiment = "neutral"

        try:
            confidence = float(parsed.get("confidence", 0.0))
        except Exception:
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        emotions = parsed.get("emotions", [])
        normalized_emotions = []
        if isinstance(emotions, list):
            for emotion in emotions[:4]:
                if not isinstance(emotion, dict):
                    continue
                name = str(emotion.get("name", "")).strip().lower()
                if not name:
                    continue
                try:
                    score = float(emotion.get("score", 0.0))
                except Exception:
                    score = 0.0
                normalized_emotions.append({
                    "name": name,
                    "score": max(0.0, min(1.0, score))
                })

        summary = str(parsed.get("summary", "")).strip()
        if not summary:
            summary = "Sentiment and emotion analysis completed."

        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "emotions": normalized_emotions,
            "summary": summary,
            "model": model_name,
        }

    @staticmethod
    def generate_caption(topic: str, language: str = "english") -> str:
        try:
            prompt = (
                f"Generate a short, engaging, emoji-rich social media caption "
                f"for the topic '{topic}' in {language}. Keep it under 25 words."
            )

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating caption: {e}")
            raise Exception(f"Gemini API error: {str(e)}")

    @staticmethod
    def generate_hashtags(topic: str, count: int = 6) -> list:
        try:
            prompt = (
                f"Generate {count} highly relevant social media hashtags for '{topic}'. "
                f"Return only hashtags separated by commas."
            )

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            raw = response.text
            tags = [tag.strip() for tag in raw.replace("\n", ",").split(",") if tag.strip()]

            # Ensure # prefix
            clean_tags = []
            for t in tags:
                if not t.startswith("#"):
                    t = "#" + t.replace(" ", "")
                clean_tags.append(t)

            return clean_tags[:count]
        except Exception as e:
            logger.error(f"Error generating hashtags: {e}")
            raise Exception(f"Gemini API error: {str(e)}")

    @staticmethod
    def generate_image(topic: str) -> str:
        try:
            sdk = Bytez(BYTEZ_API_KEY)
            model = sdk.model(BYTEZ_MODEL)

            prompt = (
                f"{topic}. Create a high-quality square image optimized for social media "
                f"(Instagram/Facebook). Use a 1:1 aspect ratio, designed for 1080x1080 px."
            )
            result = model.run(prompt)

            if result.output:
                out = result.output

                # URL
                if isinstance(out, str) and out.startswith("http"):
                    return out

                # Base64
                if isinstance(out, str) and not out.startswith("http"):
                    return f"data:image/png;base64,{out}"

                # Bytes → base64
                if isinstance(out, (bytes, bytearray)):
                    b64 = base64.b64encode(out).decode("utf-8")
                    return f"data:image/png;base64,{b64}"

            # On error, fallback placeholder
            return (
                "data:image/svg+xml,"
                "%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E"
                "%3Crect width='600' height='400' fill='%23ddd'/%3E"
                f"%3Ctext x='300' y='200' text-anchor='middle' fill='%23666'%3E{topic}%3C/text%3E"
                "%3C/svg%3E"
            )
        except Exception as e:
            logger.error(f"Error generating image: {e}")
            # Return fallback placeholder on error
            return (
                "data:image/svg+xml,"
                "%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E"
                "%3Crect width='600' height='400' fill='%23ddd'/%3E"
                f"%3Ctext x='300' y='200' text-anchor='middle' fill='%23666'%3E{topic}%3C/text%3E"
                "%3C/svg%3E"
            )

    @staticmethod
    def generate_full_content(topic: str, language: str = "english"):
        caption = AIService.generate_caption(topic, language)
        return {
            "caption": caption,
            "hashtags": AIService.generate_hashtags(topic),
            "image": AIService.generate_image(topic),
            "analysis": AIService.analyze_sentiment_and_emotion(caption, language)
        }

    @staticmethod
    def analyze_sentiment_and_emotion(text: str, language: str = "english") -> dict:
        """Analyze sentiment and emotions for any caption/post text."""
        if not text or not text.strip():
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "emotions": [],
                "summary": "No text provided for analysis."
            }

        try:
            prompt = (
                "You are a sentiment and emotion analysis engine for social media text. "
                f"Analyze the following {language} text and return ONLY valid JSON with this exact schema: "
                '{"sentiment":"positive|neutral|negative","confidence":0.0,"emotions":[{"name":"joy","score":0.0}],"summary":"short explanation"}. '
                "Rules: confidence and emotion scores must be between 0 and 1, include at most 4 emotions, and no markdown.\n\n"
                f"Text:\n{text}"
            )

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            parsed = AIService._extract_json_object(response.text)

            sentiment = str(parsed.get("sentiment", "neutral")).strip().lower()
            if sentiment not in {"positive", "neutral", "negative"}:
                sentiment = "neutral"

            try:
                confidence = float(parsed.get("confidence", 0.0))
            except Exception:
                confidence = 0.0
            confidence = max(0.0, min(1.0, confidence))

            emotions = parsed.get("emotions", [])
            normalized_emotions = []
            if isinstance(emotions, list):
                for emotion in emotions[:4]:
                    if not isinstance(emotion, dict):
                        continue
                    name = str(emotion.get("name", "")).strip().lower()
                    if not name:
                        continue
                    try:
                        score = float(emotion.get("score", 0.0))
                    except Exception:
                        score = 0.0
                    normalized_emotions.append({
                        "name": name,
                        "score": max(0.0, min(1.0, score))
                    })

            summary = str(parsed.get("summary", "")).strip()
            if not summary:
                summary = "Sentiment and emotion analysis completed."

            return {
                "sentiment": sentiment,
                "confidence": confidence,
                "emotions": normalized_emotions,
                "summary": summary
            }
        except Exception as e:
            logger.error(f"Error analyzing sentiment and emotion: {e}")
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "emotions": [],
                "summary": "Analysis unavailable right now."
            }

    @staticmethod
    def analyze_comment_batch(comments: list, language: str = "auto", model_name: str = "llama-3.3-70b-versatile") -> dict:
        """Analyze many comments in one request and return results keyed by comment id."""
        if not comments:
            return {"results": [], "model": model_name}

        structured_comments = []
        for index, comment in enumerate(comments):
            if not isinstance(comment, dict):
                continue
            structured_comments.append({
                "index": index,
                "id": str(comment.get("id") or index),
                "author": str(comment.get("author") or "Unknown"),
                "message": str(comment.get("message") or "").strip(),
            })

        if not structured_comments:
            return {"results": [], "model": model_name}

        prompt = (
            "You are a high-precision sentiment and emotion analysis engine for social media comments. "
            "Prioritize correctness over coverage. If sentiment is ambiguous, use neutral with confidence <= 0.35. "
            f"Analyze every comment in the input array and return ONLY valid JSON with this exact schema: "
            '{"results":[{"id":"comment-id","sentiment":"positive|neutral|negative","confidence":0.0,"emotions":[{"name":"joy","score":0.0}],"summary":"short explanation"}]}. '
            "Rules: return one result for every input comment id, preserve ids exactly, at most 4 emotions per comment, scores between 0 and 1, no markdown, no extra keys. "
            "Language handling: comments may be English, Urdu script, Roman Urdu, or mixed. Detect language per comment before sentiment decision. "
            "Use context cues for Urdu/Roman Urdu words like 'wah', 'shabash', 'bkwas', 'fazool', and sarcasm markers; avoid overconfident labels when meaning is uncertain. "
            "Keep sentiment labels and emotion names in English. "
            "If comment text is empty, return neutral with confidence 0 and empty emotions.\n\n"
            f"Language hint: {language}\n"
            f"Comments JSON:\n{json.dumps(structured_comments, ensure_ascii=False)}"
        )

        try:
            groq_api_key = getattr(config, "GROQ_API_KEY", None)
            groq_model = getattr(config, "GROQ_MODEL", model_name)
            if not groq_api_key or Groq is None:
                unavailable_results = []
                for comment in structured_comments:
                    unavailable_results.append({
                        "id": comment["id"],
                        "analysis": {
                            "sentiment": "neutral",
                            "confidence": 0.0,
                            "emotions": [],
                            "summary": "Groq is not configured for comment analysis.",
                            "model": groq_model,
                        },
                    })
                return {"results": unavailable_results, "model": groq_model}

            client = Groq(api_key=groq_api_key)
            response = client.chat.completions.create(
                model=groq_model,
                messages=[
                    {"role": "system", "content": "Return only strict JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            raw_text = (response.choices[0].message.content or "").strip()
            parsed = AIService._extract_json_object(raw_text)
            model_used = groq_model

            raw_results = parsed.get("results", [])
            normalized = []
            if isinstance(raw_results, list):
                for item in raw_results:
                    if not isinstance(item, dict):
                        continue
                    comment_id = str(item.get("id", "")).strip()
                    if not comment_id:
                        continue
                    normalized.append({
                        "id": comment_id,
                        "analysis": AIService._normalize_analysis_payload(item, model_used),
                    })
            return {"results": normalized, "model": model_used}
        except Exception as e:
            logger.error(f"Error analyzing comment batch: {e}")
            fallback = []
            for comment in structured_comments:
                fallback.append({
                    "id": comment["id"],
                    "analysis": {
                        "sentiment": "neutral",
                        "confidence": 0.0,
                        "emotions": [],
                        "summary": "Groq analysis failed for this request.",
                        "model": model_name,
                    },
                })
            return {"results": fallback, "model": model_name}
