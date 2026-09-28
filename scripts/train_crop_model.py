"""
KrishiSense AI — academic crop-recommendation training pipeline
================================================================

This script mirrors EXACTLY what the web platform does at server start,
so the Jupyter report and the deployed app share one methodology:

  1. Load datasets/Crop_recommendation.csv (2,200 rows, 22 crops)
  2. Inspect missing values / duplicates / class balance
  3. 80/20 stratified-shuffle split (seed 20250925 — same as the web app)
  4. Standardize features
  5. Train + compare: k-NN, Decision Tree, Random Forest, Gaussian NB
  6. Accuracy / macro precision / recall / F1 + confusion matrix
  7. Permutation feature importance for the primary model
  8. Save the best model as models/crop/crop_model.joblib

Run:
    pip install pandas numpy scikit-learn joblib matplotlib
    python scripts/train_crop_model.py
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from sklearn.inspection import permutation_importance
import joblib

SEED = 20250925  # identical to the web application
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
DATA = os.path.join(os.path.dirname(__file__), "..", "datasets", "Crop_recommendation.csv")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "crop")


def main() -> None:
    print("=" * 64)
    print("KrishiSense AI — crop recommendation pipeline")
    print("=" * 64)

    # ------------------------------------------------------------------
    # 1. Dataset analysis
    # ------------------------------------------------------------------
    df = pd.read_csv(DATA)
    print(f"\n[dataset] rows={len(df)}  classes={df['label'].nunique()}")
    print(f"[dataset] missing values:\n{df.isna().sum().to_string()}")
    print(f"[dataset] duplicates: {df.duplicated().sum()}")
    print("\n[class balance]\n" + df["label"].value_counts().to_string())
    print("\n[feature statistics]\n" + df[FEATURES].describe().round(2).to_string())

    # ------------------------------------------------------------------
    # 2. Split + scale
    # ------------------------------------------------------------------
    X = df[FEATURES].values
    y = df["label"].values
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=SEED
    )
    scaler = StandardScaler().fit(X_train)
    X_train_s, X_test_s = scaler.transform(X_train), scaler.transform(X_test)
    print(f"\n[split] train={len(X_train)}  test={len(X_test)}  seed={SEED}")

    # ------------------------------------------------------------------
    # 3. Model comparison
    # ------------------------------------------------------------------
    models = {
        "k-Nearest Neighbours (k=9)": KNeighborsClassifier(n_neighbors=9, weights="distance"),
        "Decision Tree (CART)": DecisionTreeClassifier(max_depth=8, random_state=SEED),
        "Random Forest (100 trees)": RandomForestClassifier(n_estimators=100, random_state=SEED),
        "Gaussian Naive Bayes": GaussianNB(),
    }

    results = []
    fitted = {}
    for name, model in models.items():
        model.fit(X_train_s, y_train)
        pred = model.predict(X_test_s)
        results.append(
            {
                "model": name,
                "accuracy": accuracy_score(y_test, pred),
                "precision": precision_score(y_test, pred, average="macro"),
                "recall": recall_score(y_test, pred, average="macro"),
                "f1": f1_score(y_test, pred, average="macro"),
            }
        )
        fitted[name] = model

    print("\n[model comparison on identical holdout]")
    print(pd.DataFrame(results).round(4).to_string(index=False))

    best_name = max(results, key=lambda r: r["accuracy"])["model"]
    best = fitted[best_name]
    print(f"\n[primary model] {best_name}")
    print(classification_report(y_test, best.predict(X_test_s), zero_division=0))

    cm = confusion_matrix(y_test, best.predict(X_test_s))
    print("[confusion matrix shape]", cm.shape, "— diagonal sum:", int(np.trace(cm)))

    # ------------------------------------------------------------------
    # 4. Explainability — permutation importance
    # ------------------------------------------------------------------
    perm = permutation_importance(
        best, X_test_s, y_test, n_repeats=5, random_state=SEED, n_jobs=-1
    )
    print("\n[permutation feature importance (mean accuracy drop)]")
    order = np.argsort(perm.importances_mean)[::-1]
    for i in order:
        print(f"  {FEATURES[i]:<12} {perm.importances_mean[i]:.4f} ± {perm.importances_std[i]:.4f}")

    # ------------------------------------------------------------------
    # 5. Sample explanation for one prediction
    # ------------------------------------------------------------------
    sample = np.array([[80, 45, 40, 26, 68, 6.8, 150]])
    sample_s = scaler.transform(sample)
    if hasattr(best, "predict_proba"):
        proba = best.predict_proba(sample_s)[0]
        top3 = sorted(zip(best.classes_, proba), key=lambda t: -t[1])[:3]
        print("\n[sample prediction] N=80 P=45 K=40 T=26 RH=68 pH=6.8 rain=150")
        for cls, p in top3:
            print(f"  {cls:<14} suitability {p:.2%}")

    # ------------------------------------------------------------------
    # 6. Persist model + metadata
    # ------------------------------------------------------------------
    os.makedirs(OUT_DIR, exist_ok=True)
    joblib.dump(
        {"model": best, "scaler": scaler, "features": FEATURES},
        os.path.join(OUT_DIR, "crop_model.joblib"),
    )
    with open(os.path.join(OUT_DIR, "MODEL_CARD.md"), "w") as f:
        f.write(
            f"""# crop model card

- name: crop_knn / sklearn variant
- version: v1.0
- algorithm: {best_name}
- dataset: Crop_recommendation.csv ({len(df)} records, {df['label'].nunique()} classes)
- split: 80/20 stratified, seed {SEED}
- metrics: {max(results, key=lambda r: r['accuracy'])}
- features: {FEATURES}
- note: web platform recomputes the identical evaluation at server start
  (deterministic seed), so the notebook and the deployed app never disagree.
"""
        )
    print(f"\n[saved] {os.path.join(OUT_DIR, 'crop_model.joblib')}")
    print("[saved] MODEL_CARD.md")


if __name__ == "__main__":
    main()
