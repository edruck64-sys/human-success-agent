"""
Human Success Agent
A guide through the invisible architecture of human design.
Built for those ready to see how they were created and why.
"""

import os
import json
import requests
import hashlib
import redis
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

class HumanSuccessAgent:
    """
    Guides users through the integration of spiritual design,
    neurological mechanism, and biological reality.
    """
    
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL")
        
        # Connect to Redis for user memory
        try:
            self.redis_client = redis.from_url(
                os.getenv("REDIS_URL", "redis://localhost:6379/0"),
                decode_responses=True
            )
            self.redis_client.ping()
            self.use_redis = True
            print("✅ Connected to Redis")
        except:
            self.use_redis = False
            print("⚠️  Redis not available, using in-memory storage")
            self.memory_store = {}
        
        # Core identity
        self.system_prompt = self._load_system_prompt()
        
        # Tools for deeper guidance
        self.tools = self._define_tools()
        
        print("✅ Human Success Agent initialized")
    
    def _load_system_prompt(self) -> str:
        """The agent's core identity and teaching approach"""
        return """You are the Human Success Agent.

Your purpose is to help people understand how they were designed—spiritually, neurologically, and biologically—so they can walk in their full capacity as beings created in the image and likeness of God.

Your teaching integrates:
- Scripture as the blueprint
- Jesus as the template
- Neuroscience and biology as the explainers

Your influences:
- Dr. Anita Phillips (safety, trauma, regulation)
- Neville Goddard (imagination as creation)
- Dr. Joe Dispenza (mechanism of transformation)
- HeartMath Institute (coherence)
- Dr. Caroline Leaf (thought management)

Your voice:
- Calm and grounded (earthy)
- Precise and scientific when explaining mechanism
- Reverent and expansive when discussing spirit
- Never rushed, never hype

Your progression:
1. SAFETY (Anita) — Always start here. Before anyone can change, they must feel safe in their body.
2. IMAGINATION (Neville) — Once safe, guide them to see what's not yet visible.
3. MECHANISM (Joe) — Then explain how thought becomes biology becomes reality.

Your deepest purpose:
Help people see that the Bible is not metaphor—it is instruction manual. Neuroscience is not separate from spirit—it is the mechanism. When they understand this, they stop trying to change and start *becoming*.

You measure success by evidence: tangible mental change that produces tangible life results.

You carry the joy of someone who knows they are advancing the kingdom by spreading truth.

Now guide with that authority."""
    
    def _define_tools(self) -> List[Dict]:
        """Tools the agent can use to guide users"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "assess_phase",
                    "description": "Determine which phase a user is in: Safety, Imagination, or Mechanism",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_input": {
                                "type": "string",
                                "description": "What the user said"
                            }
                        },
                        "required": ["user_input"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_practice",
                    "description": "Retrieve a specific practice for the user's current phase",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "phase": {
                                "type": "string",
                                "enum": ["safety", "imagination", "mechanism"],
                                "description": "Current phase"
                            },
                            "day": {
                                "type": "integer",
                                "description": "Day in the 21-day journey (1-21)"
                            }
                        },
                        "required": ["phase", "day"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "record_evidence",
                    "description": "Record evidence of mental change for a user",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "evidence": {
                                "type": "string",
                                "description": "What the user noticed changing"
                            },
                            "category": {
                                "type": "string",
                                "enum": ["thought", "emotion", "body", "circumstance"],
                                "description": "Type of evidence"
                            }
                        },
                        "required": ["evidence", "category"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "scripture_context",
                    "description": "Provide scriptural context with biological/neurological explanation",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "verse": {
                                "type": "string",
                                "description": "The scripture reference"
                            }
                        },
                        "required": ["verse"]
                    }
                }
            }
        ]
    
    def _execute_tool(self, tool_call: Dict, user_id: str) -> str:
        """Execute a tool based on the model's request"""
        function_name = tool_call["function"]["name"]
        arguments = json.loads(tool_call["function"]["arguments"])
        
        if function_name == "assess_phase":
            # Simple phase assessment based on keywords
            text = arguments["user_input"].lower()
            if any(word in text for word in ["anxious", "overwhelm", "unsafe", "fear", "panic", "stress"]):
                return json.dumps({"phase": "safety", "reason": "User showing signs of dysregulation"})
            elif any(word in text for word in ["visualize", "imagine", "see", "dream", "future", "possible"]):
                return json.dumps({"phase": "imagination", "reason": "User engaging imaginal capacity"})
            else:
                return json.dumps({"phase": "mechanism", "reason": "User ready for explanation"})
        
        elif function_name == "get_practice":
            phase = arguments["phase"]
            day = arguments.get("day", 1)
            
            practices = {
                "safety": {
                    1: "Sit quietly. Place one hand on your chest. Breathe in for 4, out for 8. Do this for 5 minutes. Just notice what you feel.",
                    2: "Today when you feel the old thought pattern arise, pause. Don't fight it. Just breathe. Notice where it lives in your body.",
                    3: "Write down three things that made you feel safe today. Not happy. Safe. What was present?",
                    4: "When you feel the urge to react, wait one full breath before responding. That pause is your safety installing.",
                    5: "Sit with your back straight, feet grounded. Say internally: 'My body is not the enemy. It is telling me what I need to know.'",
                    6: "Recall a time you felt completely at peace. Stay with that memory for 3 minutes. Let your body remember the feeling.",
                    7: "Today, notice when you feel safe without trying. Something small. A moment. That is your system regulating."
                },
                "imagination": {
                    8: "Close your eyes. See yourself already being the person you want to become. Not trying. Being. What do you see?",
                    9: "Write a letter from your future self—90 days from now—to who you are today. What does that self say?",
                    10: "Pick one area of your life. Imagine it completely transformed. Stay there until you can feel it as real.",
                    11: "Today, when the old identity speaks, imagine it as a voice you can observe—not the voice you are. Watch it, don't be it.",
                    12: "Think of something that is not yet true in your life, but could be. Hold it in your mind as already done. Feel the feeling of it finished.",
                    13: "Sit in silence for 10 minutes. Let images come. Don't direct them. Your imagination knows what you need to see.",
                    14: "What would you create if you knew you could not fail? See it. Feel it. Let it become real internally before it appears externally."
                },
                "mechanism": {
                    15: "Every thought you think sends electrochemical signals through your brain. Today, notice a thought you're choosing—and follow its path.",
                    16: "Thought + emotion = encoding. Take one thought you want to install. Add genuine feeling to it. Repeat 10 times with feeling.",
                    17: "Your brain cannot tell the difference between vividly imagined and real. Today, spend 5 minutes imagining your new identity with full sensory detail.",
                    18: "When you think the new thought, what happens in your body? That's not metaphor. That's biology responding to belief.",
                    19: "Repetition is not boring. It is installation. Pick one practice and do it every day this week. Same time. Same way.",
                    20: "The old thought will return. When it does, notice: 'There's the old network firing.' Don't fight. Just observe and return to the new.",
                    21: "Look back at the evidence you've collected. This is not wishful thinking. This is neural rewiring. You are not the same."
                }
            }
            
            practice = practices.get(phase, {}).get(day, "Continue with your current practice.")
            return json.dumps({"phase": phase, "day": day, "practice": practice})
        
        elif function_name == "record_evidence":
            evidence = arguments["evidence"]
            category = arguments["category"]
            
            # Store evidence in Redis
            key = f"evidence:{user_id}"
            evidence_entry = {
                "timestamp": datetime.now().isoformat(),
                "evidence": evidence,
                "category": category
            }
            
            if self.use_redis:
                self.redis_client.lpush(key, json.dumps(evidence_entry))
                self.redis_client.ltrim(key, 0, 49)  # Keep last 50
            else:
                if user_id not in self.memory_store:
                    self.memory_store[user_id] = []
                self.memory_store[user_id].append(evidence_entry)
            
            return json.dumps({"status": "recorded", "message": "Evidence saved. This will become part of your case file."})
        
        elif function_name == "scripture_context":
            verse = arguments["verse"]
            
            # Map verses to explanations
            explanations = {
                "Proverbs 23:7": "As a man thinks in his heart, so he is. The Hebrew word for 'heart' is 'lev'—the seat of intellect, emotion, and will. Neuroscience now shows that thoughts combined with emotion create neural structure. You are literally becoming what you think with feeling.",
                
                "Romans 12:2": "Be transformed by the renewing of your mind. The Greek word for transformed is 'metamorphoo'—the same root as metamorphosis. This is not surface change. This is biological restructuring through thought renewal. Neuroplasticity is the mechanism Paul described.",
                
                "Romans 4:17": "Calls those things which are not as though they were. This is not positive thinking. This is the creative principle: the brain cannot distinguish between vividly imagined and actual experience. When you imagine as already done, you install neural circuitry that precedes physical reality.",
                
                "James 2:17": "Faith without works is dead. Belief without neural installation is not belief. 'Works' here can be understood as the repeated practice of thinking and acting from the new identity until it becomes structure. Faith creates, but repetition installs."
            }
            
            explanation = explanations.get(verse, "I can help you understand this verse in light of your design. What would you like to know?")
            return json.dumps({"verse": verse, "explanation": explanation})
        
        return json.dumps({"error": f"Unknown tool: {function_name}"})
    
    def _get_user_history(self, user_id: str) -> List[Dict]:
        """Retrieve conversation history"""
        if self.use_redis:
            history = self.redis_client.get(f"history:{user_id}")
            if history:
                return json.loads(history)
        else:
            if user_id in self.memory_store:
                return self.memory_store.get(user_id, [])
        return []
    
    def _save_user_history(self, user_id: str, history: List[Dict]):
        """Save conversation history"""
        if self.use_redis:
            # Keep last 20 messages
            if len(history) > 20:
                history = history[-20:]
            self.redis_client.setex(
                f"history:{user_id}",
                86400 * 7,  # 7 days
                json.dumps(history)
            )
        else:
            self.memory_store[user_id] = history
    
    def _get_user_evidence(self, user_id: str) -> List[Dict]:
        """Retrieve evidence collected for a user"""
        if self.use_redis:
            evidence = self.redis_client.lrange(f"evidence:{user_id}", 0, -1)
            return [json.loads(e) for e in evidence]
        else:
            return self.memory_store.get(f"evidence:{user_id}", [])
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def process_message(self, message: str, user_id: str = "default") -> Dict[str, Any]:
        """
        Process a user message through the Human Success Guide
        """
        # Get user's history and evidence
        history = self._get_user_history(user_id)
        evidence = self._get_user_evidence(user_id)
        
        # Build context
        evidence_summary = ""
        if evidence:
            recent = evidence[-3:]  # Last 3 pieces of evidence
            evidence_summary = "\nUser's evidence of change:\n" + "\n".join([
                f"- {e['evidence']} ({e['category']}, {e['timestamp'][:10]})"
                for e in recent
            ])
        
        # Prepare messages
        messages = [
            {"role": "system", "content": self.system_prompt + evidence_summary},
            *history[-10:],  # Last 10 messages for context
            {"role": "user", "content": message}
        ]
        
        # Prepare API request
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "deepseek-reasoner",  # Using reasoning model for depth
            "messages": messages,
            "tools": self.tools,
            "tool_choice": "auto",
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        try:
            # Make API call
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            # Get assistant message
            assistant_message = result["choices"][0]["message"]
            
            # Handle tool calls
            if "tool_calls" in assistant_message and assistant_message["tool_calls"]:
                # Add assistant message to history
                messages.append(assistant_message)
                
                # Execute tools
                tool_responses = []
                for tool_call in assistant_message["tool_calls"]:
                    tool_result = self._execute_tool(tool_call, user_id)
                    tool_responses.append({
                        "tool_call_id": tool_call["id"],
                        "result": tool_result
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": tool_result
                    })
                
                # Get final response with tool results
                final_response = requests.post(
                    self.api_url,
                    headers=headers,
                    json={**payload, "messages": messages},
                    timeout=30
                )
                final_result = final_response.json()
                final_message = final_result["choices"][0]["message"]["content"]
                
                # Save to history
                history.append({"role": "user", "content": message})
                history.append({"role": "assistant", "content": final_message})
                self._save_user_history(user_id, history)
                
                return {
                    "success": True,
                    "response": final_message,
                    "tools_used": [tc["function"]["name"] for tc in assistant_message["tool_calls"]],
                    "user_id": user_id
                }
            
            # No tools, just return response
            final_message = assistant_message["content"]
            
            # Save to history
            history.append({"role": "user", "content": message})
            history.append({"role": "assistant", "content": final_message})
            self._save_user_history(user_id, history)
            
            return {
                "success": True,
                "response": final_message,
                "tools_used": [],
                "user_id": user_id
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Connection error: {str(e)}",
                "user_id": user_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "user_id": user_id
            }
    
    def get_user_journey(self, user_id: str) -> Dict:
        """Get the user's current journey status"""
        history = self._get_user_history(user_id)
        evidence = self._get_user_evidence(user_id)
        
        # Simple phase detection based on history
        phase = "safety"  # default
        if len(history) > 20:
            phase = "mechanism"
        elif len(history) > 10:
            phase = "imagination"
        
        return {
            "user_id": user_id,
            "current_phase": phase,
            "message_count": len(history),
            "evidence_count": len(evidence),
            "days_active": min(len(history) // 2, 21)  # Rough estimate
        }
    
    def clear_user_data(self, user_id: str):
        """Clear all data for a user"""
        if self.use_redis:
            self.redis_client.delete(f"history:{user_id}")
            self.redis_client.delete(f"evidence:{user_id}")
        else:
            if user_id in self.memory_store:
                del self.memory_store[user_id]

# Test
if __name__ == "__main__":
    agent = HumanSuccessAgent()
    print("\n" + "="*60)
    print("🧘 Human Success Agent Test")
    print("="*60)
    
    # Test conversation
    test_user = "test_user_1"
    
    messages = [
        "I keep having the same anxious thoughts and I can't stop them",
        "How do I actually change? I've read so much but nothing shifts",
        "What does the Bible mean when it says as a man thinks in his heart?",
        "I think I'm finally getting it. Something feels different."
    ]
    
    for msg in messages:
        print(f"\n👤 User: {msg}")
        result = agent.process_message(msg, test_user)
        if result["success"]:
            print(f"🤖 Guide: {result['response'][:150]}...")
            if result["tools_used"]:
                print(f"   [Used: {', '.join(result['tools_used'])}]")
        else:
            print(f"❌ Error: {result['error']}")
        print("-"*40)
    
    # Show journey
    journey = agent.get_user_journey(test_user)
    print(f"\n📊 Journey: Phase={journey['current_phase']}, "
          f"Messages={journey['message_count']}, "
          f"Evidence={journey['evidence_count']}")
