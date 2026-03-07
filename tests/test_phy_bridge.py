import http.client
import json

def test_simulation():
    conn = http.client.HTTPConnection("localhost", 8000)
    
    payload = {
        "objects": [
            {
                "id": "body1",
                "geometry": {
                    "id": "geo1",
                    "type": "box",
                    "position": {"x": 0, "y": 10, "z": 0},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "dimensions": {"x": 1, "y": 1, "z": 1}
                },
                "physics": {
                    "mass": 1.0,
                    "restitution": 0.5,
                    "friction": 0.3,
                    "is_static": False
                }
            }
        ],
        "constraints": [
            {
                "id": "fixed1",
                "type": "fixed",
                "target_a": "body1",
                "anchor": {"x": 0, "y": 10, "z": 0},
                "axis": {"x": 0, "y": 1, "z": 0} # Fix Y axis
            },
            {
                "id": "fixed2",
                "type": "fixed",
                "target_a": "body1",
                "anchor": {"x": 0, "y": 10, "z": 0},
                "axis": {"x": 1, "y": 0, "z": 0} # Fix X axis
            },
             {
                "id": "fixed3",
                "type": "fixed",
                "target_a": "body1",
                "anchor": {"x": 0, "y": 10, "z": 0},
                "axis": {"x": 0, "y": 0, "z": 1} # Fix Z axis
            }
        ],
        "time_step": 0.1,
        "duration": 0.5
    }
    
    headers = {'Content-type': 'application/json'}
    
    try:
        print("Sending simulation request...")
        json_payload = json.dumps(payload)
        conn.request("POST", "/simulate", json_payload, headers)
        response = conn.getresponse()
        
        status = response.status
        data = json.loads(response.read().decode())
        
        if status == 200:
            print(f"Simulation success! Received {len(data['frames'])} frames.")
            for frame in data['frames']:
                t = frame['time']
                for state in frame['states']:
                    pos = state['position']
                    print(f"  t={t:.2f} | {state['id']} pos: ({pos['x']:.2f}, {pos['y']:.2f}, {pos['z']:.2f})")
        else:
            print(f"Test failed with status {status}")
            print(f"Error detail: {data}")
                
    except Exception as e:
        print(f"Test failed: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_simulation()
