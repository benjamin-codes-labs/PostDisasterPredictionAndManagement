from ultralytics import YOLO
import cv2
import serial
import time
import pandas as pd
import random
import os

# 定义垃圾类型映射（扩展到7类）
types = [
    {"key": "Glass", "name": "玻璃"},
    {"key": "Metal", "name": "金属"},
    {"key": "Plastic", "name": "塑料"},
    {"key": "Trash", "name": "垃圾"},
    {"key": "Kitchen", "name": "厨余垃圾"},
    {"key": "Hazardous", "name": "有害垃圾"},
    {"key": "Large", "name": "大型垃圾"}
]

COM_PORT = 'COM3'
BAUD_RATES = 115200

# 检测GPS插件
use_gps = False
try:
    ser = serial.Serial(COM_PORT, BAUD_RATES, timeout=1)
    use_gps = True
    print("GPS plugin detected, using real GPS data")
except serial.SerialException:
    print("No GPS plugin detected, using simulated data")
    ser = None

print("Operation Start")

# 检查并初始化CSV文件
if not os.path.exists('output.csv'):
    with open('output.csv', 'w', encoding='utf-8') as f:
        f.write("ID,垃圾类型,纬度,经度,数量,记录时间\n")
    print("Created output.csv with headers")

formatted_str_1 = ""
formatted_str_0 = ""

# Load a  trained Model
model = YOLO("train7/weights/best.pt")

# Initial the camera
test_mode = False  # 设置为 True 使用测试图像
if test_mode:
    # 使用静态测试图像
    import numpy as np
    frame = np.zeros((480, 640, 3), dtype=np.uint8)  # 黑色图像
    print("Using test mode with static image")
else:
    cap = cv2.VideoCapture(0)  # 尝试 0, 1, 2 等
    #cap = cv2.VideoCapture("http://192.168.50.10:81/stream")
    if not cap.isOpened():
        print("Cannot open camera")
        exit()
    else:
        print("Camera opened successfully")

#Process video frames
while True:
    if test_mode:
        ret = True  # 总是成功
        # 可以在这里加载不同的测试图像
    else:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame from camera")
            break

        print(f"Frame captured: shape {frame.shape}")  # 调试输出

    #Run prediction with tracking enabled
    results = model.track(frame)

    #Visualize the tracked on the frame
    result_frame = results[0].plot()

    # 获取位置数据
    if use_gps:
        try:
            data_raw = ser.readline()
            data = str(data_raw.decode())
            x = str(data).split(',')
            new0_x = x[0]
            formatted_str_0 = "{:.10}".format(new0_x)  # 经度
            new1_x = x[1].replace("\r\r\n", "")
            formatted_str_1 = "{:.11}".format(new1_x)  # 纬度
            print("經度：", formatted_str_0)
            print("緯度：", formatted_str_1)
        except:
            # 如果读取失败，使用模拟
            formatted_str_0 = "{:.6f}".format(random.uniform(113.5, 113.6))  # 经度
            formatted_str_1 = "{:.6f}".format(random.uniform(22.1, 22.3))    # 纬度
            print("GPS read failed, using simulated: 經度", formatted_str_0, "緯度", formatted_str_1)
    else:
        # 使用模拟数据
        formatted_str_0 = "{:.6f}".format(random.uniform(113.5, 113.6))  # 经度
        formatted_str_1 = "{:.6f}".format(random.uniform(22.1, 22.3))    # 纬度
        print("Using simulated: 經度", formatted_str_0, "緯度", formatted_str_1)

    time.sleep(1)


    for r in results:
        print(len(r))  # print tracking IDs
        results_2 = str(len(r))
        count = int(results_2)
        if count >= 1:
            # 统计每个类别的数量
            class_counts = {}
            for box in r.boxes:
                cls = int(box.cls.item())
                class_name = types[cls]["name"] if cls < len(types) else "未知"
                if class_name in class_counts:
                    class_counts[class_name] += 1
                else:
                    class_counts[class_name] = 1
            
            # 为每个类别输出到CSV
            current_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
            for type_name, qty in class_counts.items():
                garbage_id = int(time.time() * 1000)  # 使用毫秒时间戳作为ID
                row = f"{garbage_id},{type_name},{formatted_str_1},{formatted_str_0},{qty},{current_time}\n"
                with open('output.csv', 'a', encoding='utf-8') as f:
                    f.write(row)
                print(f"已保存: {row.strip()}")
        else:
            print("nothing seen")

    #Write the frame and display by cv2.imshow
    cv2.imshow('frame', result_frame)
    if cv2.waitKey(1) == ord('q'):
        break

#Release resources
cap.release()
cv2.destroyAllWindows()