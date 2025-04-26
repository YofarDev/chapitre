import json

def check_json(raw_string:str)->dict:
    try:
        start_index = raw_string.find("{")
        end_index = raw_string.rfind("}")
        if start_index == -1 or end_index == -1 or start_index > end_index:
            raise ValueError("Could not find valid JSON object boundaries")

        json_string = raw_string[start_index : end_index + 1]
        return json.loads(json_string)

    except Exception as e:
        with open("error_json_debug_log.txt", "w") as f:
            f.write(f"{str(e)}\n\n{raw_string}\n\n{'*'*16}\n")
        return