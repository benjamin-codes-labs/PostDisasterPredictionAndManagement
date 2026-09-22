# Post-Disaster Surface Garbage Intelligent Recognition System

> A GIS-based Watershed Analysis and YOLOv12 Deep Learning Model for Post-Typhoon Surface Garbage Detection – A Case Study of Macau

---

## 📖 Project Overview

This project aims to develop a garbage hotspot detection system that integrates **Macau's terrain and watershed models** with a **YOLOv12 deep learning model** to enhance post-typhoon waste management efficiency. The system uses GIS watershed analysis to predict high-risk garbage accumulation zones and employs YOLOv12 to identify garbage from security cameras or mobile devices, ultimately marking garbage distribution on a map to optimize cleanup resource allocation.

Using Macau as a case study, the research addresses the issue of low-lying areas becoming high-risk zones for garbage accumulation during heavy rainfall. It proposes a full-chain management solution covering "pre-disaster prediction – during-disaster monitoring – post-disaster assessment."

---

## ✨ Key Features

### 1. Garbage Recognition System
- Real-time garbage detection based on the **YOLOv12** deep learning model
- Supports **14 garbage categories**:
  - Small land-based waste: Can, Cardboard, Glass bottle, Plastic food packaging, Plastic bag, Paper Bag, Paper Cup, Food leftover, Plastic bottle, Cloth, Carton, Paper food container, Pile of leaves
  - Large waste: Fallen tree

### 2. GIS Watershed Analysis
- Based on Macau's **5-meter resolution Digital Elevation Model (DEM)** data
- Identifies surface depressions and runoff convergence zones
- Terrain curvature analysis to locate low-lying high-risk areas
- Integrates hydrological models to predict garbage accumulation hotspots

### 3. Map Visualization
- Interactive map based on **Leaflet**
- Garbage markers and heatmap display
- Supports CSV data import/export
- Filter display by garbage type

### 4. Real-time Monitoring and Alerts
- Weather information integration
- Air quality monitoring
- Disaster simulation (typhoon, storm surge, rainstorm)
- Shelter information query

### 5. Disaster Response Guidelines
- Response tips for earthquakes, floods, typhoons, wildfires, extreme heat, infectious diseases, etc.
- Bilingual (Chinese/English) support

---

## 🧠 Technical Architecture

### Deep Learning Model
- **YOLOv12**: Uses CSPNextNet-XX backbone
- Combines BiFPN and PAN for efficient multi-scale object detection
- Trained for 300 epochs, best performance at epoch 255
- Open-source and free, significantly reducing development costs

### Data Augmentation
- Horizontal Flip
- Noise Injection
- Counter-clockwise rotation of 10° and 20°
- Balances sample counts across categories to avoid model bias

### GIS Analysis
- Terrain curvature analysis
- Runoff convergence zone identification
- Hydrological model integration
- Dynamic factor embedding (obstruction of runoff by construction waste, fallen trees, and garbage)

### Frontend Technologies
- HTML5 / CSS3 / JavaScript
- Leaflet map library
- Leaflet.heat plugin

### Backend Technologies
- Python
- Ultralytics YOLO
- OpenCV
- PySerial (GPS module)
- Pandas

---

## 📊 Model Performance

| Metric | Value |
|--------|-------|
| Precision | **91.0%** |
| Recall | **85.5%** |
| Mean Average Precision (mAP) | **89.5%** |
| mAP@50-95 | **0.653** |
| Box Loss | 0.774 |
| Class Loss | 0.335 |
| Object Loss | 0.973 |
| F1 Score | **0.882** |

### Per-Class mAP50 (Partial)
- Fallen tree: 54
- Can: 98
- Cardboard: 94
- Carton: 97
- Cloth: 99
- Food leftover: 93
- Glass bottle: 88
- Paper Bag: 98
- Paper Cup: 98
- Paper food container: 97
- Pile of leaves: 72
- Plastic bag: 82
- Plastic bottle: 95

---

## 📁 Project Structure

```text
├── index.html              # Main page
├── script.js               # Frontend JavaScript logic
├── style.css               # Stylesheet
├── yolo_online_cam.py      # YOLOv12 real-time camera detection
├── output.csv              # Garbage detection output data
├── args.yaml               # YOLO training configuration
├── last.pt                 # Trained model weights
└── README.md               # Project documentation
```

---

## 🚀 Quick Start

### Requirements

- Python 3.8+
- Node.js (optional, for local server)
- Modern browser (Chrome / Firefox / Edge)

### Frontend Usage

1. Open `index.html` directly in a browser.
2. Select a mode:
   - **Garbage Recognition**: Use the camera for garbage identification.
   - **Garbage Distribution**: View the garbage distribution map.
3. Switch between Chinese and English interfaces.

### Backend YOLO Detection

```bash
# Install dependencies
pip install ultralytics opencv-python pyserial pandas

# Run real-time detection
python yolo_online_cam.py
```

> Note: `yolo_online_cam.py` loads `train7/weights/best.pt` by default. Adjust the model path as needed. The project also includes `last.pt` model weights.

### CSV Data Format

```csv
ID,Garbage Type,Latitude,Longitude,Count,Timestamp
```

---

## 🗺️ GIS Watershed Analysis and High-Risk Areas

### Terrain Curvature Analysis
- Areas with curvature values below 0 account for approximately **14.3%** of the Macau Peninsula.
- Mainly distributed in **Inner Harbour, Praia do Manduco, and Ilha Verde**.
- These natural depressions become priority runoff convergence zones during heavy rain.

### High-Risk Areas
1. **Inner Harbour** — average elevation 1.2 m
2. **Ilha Verde** — natural depression
3. **Praia do Manduco** — low-lying area
4. **Toi San, Iao Hon, Areia Preta, Fai Chi Kei** — relatively low terrain
5. **Rua do Mercado, Lam Mau Tong, Patane, San Kio** — dense building areas

### Elevation Data
- Areas below 2 m elevation account for only **29%** of Macau's land area.
- Some local depressions are even 0.5 m below sea level.
- This exacerbates flooding risks under tidal backwater effects.

---

## 🌐 System Modules

### Weather and Environmental Monitoring
- Real-time weather information
- 7-day weather forecast
- Today's forecast and hourly observations
- Real-time air quality monitoring (PM2.5, PM10)

### Disaster Simulation
- Typhoon level simulation (Signal No. 1 to No. 10)
- Wind direction simulation (SE, SW, NE, NW)
- Storm surge level simulation (Blue, Yellow, Orange, Red, Black)
- Rainstorm level simulation (Yellow, Red, Black)

### Shelters
- Shelter information for each parish in Macau
- Level 1 shelters (Signal No. 8 or above)
- Level 2 shelters (evacuation)

### City Map Preview
- Parishes of the Macau Peninsula
- Taipa, Cotai, and Coloane
- Other areas

---

## 📈 Future Work

### 1. Technical Optimization and Model Upgrade
- Expand training dataset with more garbage types and environmental conditions (night, low visibility, rain, etc.)
- Introduce transfer learning and self-supervised learning to reduce reliance on large labeled datasets
- Integrate **BeiDou Satellite Positioning System** for finer garbage localization

### 2. Intelligent Cleaning Robot Integration
- Combine with intelligent cleaning robots for fully automated garbage cleanup
- Use garbage distribution heatmaps and YOLOv12 detection results to automatically plan cleanup routes
- Heavy robots handle large fallen trees or construction waste; light robots handle small garbage

### 3. Public Participation and Data Sharing
- Develop mobile applications integrated with street CCTV for real-time detection
- Show cleanup progress and environmental recovery status to the public in real time
- Build a unified Greater Bay Area disaster management data platform

### 4. Cross-Regional Cooperation and Greater Bay Area Disaster Management
- Enable data sharing and collaborative operations among Macau, Hong Kong, Shenzhen, etc.
- Integrate terrain data and garbage recognition results from each city
- Provide regional disaster impact assessments and resource allocation recommendations

---

## 📚 References

### Chinese References
- 林怡君、莊諶雄. (2018). 澳門天鴿與山竹颱風的災害分析與因應策略. 澳門大學.
- 地球物理暨氣象局. (2019). 《澳門防災減災規劃 (2019-2028 年)》. 澳門特別行政區政府.
- 澳門環境保護局. (2023). 《澳門環境狀況報告 2023》. 澳門特別行政區政府.
- 黃少敏. (1990). 澳門地貌概要. Macau Data.

### English References
- Peiyuan Jiang, Daji Ergu, Fangyao Liu, Ying Cai, Bo Ma. (2022). A Review of Yolo Algorithm Developments. *Procedia Computer Science*, 199, 1066-1073.
- Wang, L., Wu, Z., Zhang, W., Wang, X., & Feng, W. (2025). Dynamic life cycle environmental impact assessment for urban built environment based on BIM and GIS. *Energy and Buildings*, 333, 115445.
- Bennett, G. (2025). A review of the data used to validate groundwater recharge maps created with GIS techniques over the past two decades. *HydroResearch*, 8, 276-285.
- Karuppasamy, M., Wang, H. P., Koh, J. Y., Wang, H., & Yeong, C. F. (2022). An automated solid waste detection using the optimized YOLO model for riverine management. *Frontiers in Public Health*, 10, 907280.
- Han, W., Feng, R., Wang, L., & Cheng, Y. (2020). A semi-supervised generative framework with deep learning features for high-resolution remote sensing image scene classification. *ISPRS Journal of Photogrammetry and Remote Sensing*, 167, 58-74.
- Rajmohan, M., Reshmi, E., Satyanand, P. V., & Vishnu, K. (2023). Advanced YOLO-based trash classification and recycling assistant for enhanced waste management and sustainability. *Advances in Sustainability Science and Technology*, 185-196.

---

## 👥 Research Team

Ao Chun Meng, Leong Hou Wang, Sao Cheng Tai, Sam U Hin, Wong Chi Yu

---

## 📄 License

This project is licensed under the **AGPL-3.0** License.

---

## 🙏 Acknowledgements

We thank the relevant departments of the Macau Special Administrative Region Government for providing public data and literature support.

---

> **Note**: This system is a research project. For actual deployment, please comply with relevant laws, regulations, and privacy policies.

# 颱風災後地表垃圾智慧辨識系統
## Post-Disaster Surface Garbage Intelligent Recognition System

> 融合 GIS 流域解析與 YOLOv12 深度學習模型的颱風災後地表垃圾智慧辨識系統方案 —— 以澳門為例

---

## 📖 項目簡介

本項目旨在開發一套結合 **澳門地勢流域模型** 與 **YOLOv12 深度學習模型** 的垃圾熱點偵測系統，以提升颱風災後垃圾管理效率。系統透過 GIS 流域分析預測垃圾堆積高風險區域，並利用 YOLOv12 於安全攝影機或移動設備上辨識垃圾，最終在地圖上標示垃圾分布，協助優化清理資源配置。

本研究以澳門為例，針對低窪地區在暴雨期間易成為垃圾堆積高風險區的問題，提出「災前預測－災中監控－災後評估」的全鏈條管理方案。

---

## ✨ 主要功能

### 1. 垃圾識別系統
- 基於 **YOLOv12** 深度學習模型進行即時垃圾檢測
- 支援 **14 種垃圾類別** 識別：
  - 小型陸源垃圾：罐頭 (Can)、紙箱 (Cardboard)、玻璃瓶 (Glass bottle)、塑膠食品包裝 (Plastic food packaging)、塑膠膠袋 (Plastic bag)、紙袋 (Paper Bag)、紙杯 (Paper Cup)、廚餘 (Food leftover)、塑膠瓶 (Plastic bottle)、紡織品 (Cloth)、小形紙盒 (Carton)、紙質食物包裝 (Paper food container)、樹葉堆 (Pile of leaves)
  - 大型垃圾：倒塌樹木 (Fallen tree)

### 2. GIS 流域解析
- 基於澳門 **5 米分辨率數字高程模型 (DEM)** 數據
- 識別地表凹陷與徑流匯聚帶
- 地形曲率分析，定位低窪高風險區域
- 整合水文模型預測垃圾堆積熱點

### 3. 地圖可視化
- 基於 **Leaflet** 的交互式地圖
- 垃圾佈點標記與熱力圖展示
- 支援 CSV 數據導入導出
- 按垃圾類型篩選顯示

### 4. 即時監控與預警
- 天氣資訊整合
- 空氣品質監測
- 災害模擬（颱風、風暴潮、暴雨）
- 避險中心資訊查詢

### 5. 災害應對指南
- 地震、洪水、颱風、野火、極端高溫、傳染病等應對要點
- 中英文對照

---

## 🧠 技術架構

### 深度學習模型
- **YOLOv12**：採用 CSPNextNet-XX 骨幹網
- 結合 BiFPN 與 PAN 技術實現高效多尺度目標檢測
- 訓練迭代 300 次，在第 255 次達到最佳性能
- 資源免費開放，大幅降低開發成本

### 數據增強
- 水平翻轉 (Horizontal Flip)
- 噪音注入 (Noise Injection)
- 逆時針旋轉 10 度和 20 度
- 平衡各類別樣本數量，避免模型訓練偏差

### GIS 分析
- 地形曲率分析
- 徑流匯聚帶識別
- 水文模型整合
- 動態因子嵌入（建築廢料、傾倒樹木、垃圾對徑流的阻礙）

### 前端技術
- HTML5 / CSS3 / JavaScript
- Leaflet 地圖庫
- Leaflet.heat 熱力圖插件

### 後端技術
- Python
- Ultralytics YOLO
- OpenCV
- PySerial（GPS 模組）
- Pandas

---

## 📊 模型性能

| 指標 | 數值 |
|------|------|
| 精確度 (Precision) | **91.0%** |
| 召回率 (Recall) | **85.5%** |
| 平均精確度均值 (mAP) | **89.5%** |
| mAP@50-95 | **0.653** |
| 邊界框損失 (Box loss) | 0.774 |
| 類別損失 (Class loss) | 0.335 |
| 物體損失 (Object loss) | 0.973 |
| F1 分數 | **0.882** |

### 各類別 mAP50 表現（部分）
- Fallen tree: 54
- Can: 98
- Cardboard: 94
- Carton: 97
- Cloth: 99
- Food leftover: 93
- Glass bottle: 88
- Paper Bag: 98
- Paper Cup: 98
- Paper food container: 97
- Pile of leaves: 72
- Plastic bag: 82
- Plastic bottle: 95

---

## 📁 項目結構

```text
├── index.html              # 主頁面
├── script.js               # 前端 JavaScript 邏輯
├── style.css               # 樣式表
├── yolo_online_cam.py      # YOLOv12 即時攝像頭檢測
├── output.csv              # 垃圾檢測輸出數據
├── args.yaml               # YOLO 訓練配置
├── last.pt                 # 訓練好的模型權重
└── README.md               # 項目說明文檔
```

---

## 🚀 快速開始

### 環境要求

- Python 3.8+
- Node.js（可選，用於本地伺服器）
- 現代瀏覽器（Chrome / Firefox / Edge）

### 前端使用

1. 直接在瀏覽器中打開 `index.html`
2. 選擇模式：
   - **垃圾識別**：使用攝像頭進行垃圾識別
   - **垃圾分佈**：查看垃圾分佈地圖
3. 可切換中英文介面

### 後端 YOLO 檢測

```bash
# 安裝依賴
pip install ultralytics opencv-python pyserial pandas

# 運行即時檢測
python yolo_online_cam.py
```

> 注意：`yolo_online_cam.py` 預設載入 `train7/weights/best.pt`，請根據實際模型路徑調整。專案中亦提供 `last.pt` 模型權重。

### CSV 數據格式

```csv
ID,垃圾类型,纬度,经度,数量,记录时间
```

---

## 🗺️ GIS 流域解析與高風險區域

### 地形曲率分析
- 曲率值低於 0 的區域約佔澳門半島面積的 **14.3%**
- 主要分佈於 **內港、司打口及青洲** 一帶
- 這些天然凹陷地形在暴雨期間成為地表徑流的優先匯聚區

### 高風險區域
1. **內港** — 平均海拔 1.2 米
2. **青洲** — 天然凹陷地帶
3. **司打口** — 低窪區域
4. **台山、祐漢、黑沙環、筷子基** — 地勢較低
5. **紅街市、林茂塘、沙梨頭、新橋** — 建築密集區

### 海拔數據
- 海拔低於 2 米的區域僅佔澳門陸域面積的 **29%**
- 局部凹陷處甚至低於海平面 0.5 米
- 加劇潮汐頂托作用下的積水風險

---

## 🌐 系統模組

### 天氣與環境監測
- 實時天氣資訊
- 未來七日天氣預報
- 今日預測與整點實況
- 實時空氣品質監測（PM2.5、PM10）

### 災害模擬
- 颱風等級模擬（一號至十號風球）
- 風向模擬（東南、西南、東北、西北）
- 風暴潮等級模擬（藍、黃、橙、紅、黑）
- 暴雨等級模擬（黃、紅、黑）

### 避險中心
- 澳門各堂區避險中心資訊
- 一級避險中心（八號或以上風球）
- 二級避險中心（撤離避險）

### 城市地圖預覽
- 澳門半島各堂區
- 氹仔、路氹及路環
- 其他區域

---

## 📈 未來展望

### 1. 技術優化與模型升級
- 擴充訓練數據集，納入更多種類垃圾與不同環境條件影像（夜間、低能見度、雨天等）
- 引入遷移學習與自監督學習技術，減少對大量標註數據的依賴
- 整合 **北斗衛星定位系統**，實現更精細的垃圾定位

### 2. 智能清潔機器人整合
- 與智能清潔機器人結合，實現全自動化垃圾清理
- 利用垃圾分布熱點圖和 YOLOv12 識別結果，自動規劃清理路徑
- 大型倒樹或建築廢料由重型機器人處理，小型垃圾由輕型機器人負責

### 3. 公眾參與與數據共享
- 開發移動應用程序，配合街道閉路電視實時偵測
- 向公眾實時展示清理進度與環境恢復狀況
- 建立大灣區統一的災害管理數據平台

### 4. 跨區域合作與大灣區災害管理
- 實現澳門、香港、深圳等城市間的數據共享與協同作業
- 整合各城市地勢數據與垃圾辨識結果
- 提供區域性災害影響評估與資源調配建議

---

## 📚 參考文獻

### 中文文獻
- 林怡君、莊諶雄 (2018). 澳門天鴿與山竹颱風的災害分析與因應策略. 澳門大學.
- 地球物理暨氣象局 (2019). 《澳門防災減災規劃 (2019-2028 年)》. 澳門特別行政區政府.
- 澳門環境保護局 (2023). 《澳門環境狀況報告 2023》. 澳門特別行政區政府.
- 黃少敏 (1990). 澳門地貌概要. Macau Data.

### 英文文獻
- Peiyuan Jiang, Daji Ergu, Fangyao Liu, Ying Cai, Bo Ma. (2022). A Review of Yolo Algorithm Developments. *Procedia Computer Science*, 199, 1066-1073.
- Wang, L., Wu, Z., Zhang, W., Wang, X., & Feng, W. (2025). Dynamic life cycle environmental impact assessment for urban built environment based on BIM and GIS. *Energy and Buildings*, 333, 115445.
- Bennett, G. (2025). A review of the data used to validate groundwater recharge maps created with GIS techniques over the past two decades. *HydroResearch*, 8, 276-285.
- Karuppasamy, M., Wang, H. P., Koh, J. Y., Wang, H., & Yeong, C. F. (2022). An automated solid waste detection using the optimized YOLO model for riverine management. *Frontiers in Public Health*, 10, 907280.
- Han, W., Feng, R., Wang, L., & Cheng, Y. (2020). A semi-supervised generative framework with deep learning features for high-resolution remote sensing image scene classification. *ISPRS Journal of Photogrammetry and Remote Sensing*, 167, 58-74.
- Rajmohan, M., Reshmi, E., Satyanand, P. V., & Vishnu, K. (2023). Advanced YOLO-based trash classification and recycling assistant for enhanced waste management and sustainability. *Advances in Sustainability Science and Technology*, 185-196.

---

## 🙏 致謝

感謝澳門特別行政區政府相關部門提供的公開數據與文獻支持。

---

> **注意**：本系統為研究項目，實際部署請遵循相關法律法規和隱私政策。
