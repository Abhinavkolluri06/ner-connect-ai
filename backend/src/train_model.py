import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
import xgboost as xgb
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

print("🚀 Training Road Hazard Classifier...")

# Generate synthetic data (10,000 samples)
np.random.seed(42)
n = 10000
data = {
    'slope_deg': np.random.gamma(2,4,n)+1,
    'elevation_m': np.random.normal(800,400,n),
    'rainfall_24h_mm': np.random.exponential(10,n),
    'rainfall_72h_antecedent_mm': np.random.exponential(30,n),
    'isro_landslide_susceptibility': np.random.choice([1,2,3,4,5], n, p=[0.2,0.25,0.25,0.2,0.1]),
    'lulc_type': np.random.choice(['Forest','Barren/Hillside','Agriculture','Settlement'], n),
    'road_class': np.random.choice(['National Highway','State Highway','Major District Road','Rural/PMGSY'], n),
    'distance_to_drainage_km': np.random.exponential(2,n),
}
df = pd.DataFrame(data)

# Target: road is bad if any risk factor present
df['is_bad'] = ((df['slope_deg']>15) | (df['isro_landslide_susceptibility']>=4) |
                (df['rainfall_24h_mm']>25) | (df['rainfall_72h_antecedent_mm']>60) |
                ((df['distance_to_drainage_km']<0.5) & (df['rainfall_24h_mm']>15))).astype(int)
# Add 5% noise
noise = np.random.choice(n, int(n*0.05), replace=False)
df.loc[noise, 'is_bad'] = 1 - df.loc[noise, 'is_bad']

# Encode categoricals
for col in ['lulc_type','road_class']:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    joblib.dump(le, f'models/saved_models/encoder_{col}.pkl')

features = ['slope_deg','elevation_m','rainfall_24h_mm','rainfall_72h_antecedent_mm',
            'isro_landslide_susceptibility','lulc_type','road_class','distance_to_drainage_km']
X = df[features]
y = df['is_bad']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)
joblib.dump(scaler, 'models/saved_models/scaler.pkl')

model = xgb.XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42,
                          use_label_encoder=False, eval_metric='logloss')
model.fit(X_train_s, y_train)

y_pred = model.predict(X_test_s)
print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred))
print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
print(f"ROC-AUC: {roc_auc_score(y_test, model.predict_proba(X_test_s)[:,1]):.3f}")

joblib.dump(model, 'models/saved_models/road_hazard_xgboost.pkl')
with open('models/saved_models/feature_columns.json', 'w') as f:
    json.dump(features, f)
print("✅ Model saved to models/saved_models/")