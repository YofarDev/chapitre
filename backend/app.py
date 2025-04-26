import os
import json
import logging
from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
import webbrowser

from llm_service import prompt_llm
from models.llm_api import LLM_API
from utils.utils import check_json

app = Flask(__name__, static_folder='../frontend')
CORS(app)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_default_secret_key_for_dev') # Replace with a strong key in production

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load system prompt and LLM config
SYSTEM_PROMPT = ""
LLM_CONFIG = None

def load_config():
    global SYSTEM_PROMPT, LLM_CONFIG
    try:
        with open('assets/system_prompt.txt', 'r') as f:
            SYSTEM_PROMPT = f.read()
        logger.info("System prompt loaded.")

        with open('backend/llm_apis.json', 'r') as f:
            llm_apis_data = json.load(f)

        # Assuming you want to use the first API listed or a specific one
        # For now, let's just take the first one and assume API key is in env
        if llm_apis_data:
            api_info = llm_apis_data[0]
            api_key = api_info['api_key'] 
            LLM_CONFIG = LLM_API(
                model=api_info['model'],
                api_key=api_key,
                url=api_info.get('url', ''),
                delay_ms=api_info.get('delay_ms', 0)
            )
            logger.info(f"LLM config loaded for {api_info['model']}.")
        else:
            raise ValueError("No LLM API configurations found in llm_apis.json")

    except FileNotFoundError as e:
        logger.error(f"Configuration file not found: {e}")
        # Handle missing files - maybe exit or raise exception
        exit(1) # Exit if essential config is missing
    except json.JSONDecodeError:
        logger.error("Error decoding llm_apis.json")
        exit(1)
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        exit(1)
    except Exception as e:
        logger.error(f"An unexpected error occurred loading config: {e}")
        exit(1)

# Load configuration on startup
load_config()


# Serve frontend files
@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/story', methods=['POST'])
def handle_story_interaction():
    """Handles initial prompt and subsequent story choices/text inputs."""
    if LLM_CONFIG is None or not SYSTEM_PROMPT:
        return jsonify({"error": "Backend not configured properly."}), 500

    data = request.json
    input_type = data.get('type')
    input_value = data.get('value')

    if not input_type or input_value is None:
        return jsonify({"error": "Invalid input format."}), 400

    # Retrieve or initialize conversation history
    conversation_history = session.get('conversation_history', [])

    try:
        if input_type == 'start':
            # For the initial prompt, the user's input is the first message
            conversation_history = [{"role": "user", "content": json.dumps({"type": "start", "value": input_value})}]
        elif input_type in ['choice', 'text']:
            # For subsequent turns, append the user's action as a user message
            conversation_history.append({"role": "user", "content": json.dumps({"type": input_type, "value": input_value})})
        else:
            return jsonify({"error": "Invalid input type."}), 400

        # Call the LLM service with the full history
        llm_raw_response = prompt_llm(SYSTEM_PROMPT, conversation_history, LLM_CONFIG)

        # Attempt to parse the LLM's JSON response
        try:
            llm_response_json = check_json(llm_raw_response)
            # Append LLM's response to history as an assistant message
            conversation_history.append({"role": "assistant", "content": llm_raw_response})
            session['conversation_history'] = conversation_history # Save updated history

            # Validate the expected keys are present
            if 'narrative' not in llm_response_json or 'input_type' not in llm_response_json or 'is_end' not in llm_response_json:
                 logger.error(f"LLM response missing required keys: {llm_response_json}")
                 return jsonify({"error": "Invalid response format from LLM."}), 500

            # Return the parsed JSON to the frontend
            return jsonify(llm_response_json)

        except json.JSONDecodeError:
            logger.error(f"LLM returned non-JSON response: {llm_raw_response}")
            return jsonify({"error": "LLM returned an unparseable response."}), 500
        except Exception as e:
            logger.error(f"Error processing LLM response: {e}")
            return jsonify({"error": "Error processing LLM response."}), 500

    except Exception as e:
        logger.error(f"Error during story interaction: {e}")
        return jsonify({"error": "An error occurred during story generation."}), 500

if __name__ == '__main__':
    # Open browser when starting
    #webbrowser.open('http://localhost:5000')
    app.run(debug=True)
