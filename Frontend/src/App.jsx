import { useState } from "react";
import { UploadCloud, Activity, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// Map backend class abbreviations to full, readable disease names
const DISEASE_NAMES = {
  'akiec': "Actinic Keratoses (Bowen's Disease)",
  'bcc': 'Basal Cell Carcinoma',
  'bkl': 'Benign Keratosis-like Lesions',
  'df': 'Dermatofibroma',
  'mel': 'Melanoma',
  'nv': 'Melanocytic Nevi',
  'vasc': 'Vascular Lesions'
};

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
      setPreview(URL.createObjectURL(f));
    }
  };

  const predict = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Failed to connect to the prediction server.");

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Area */}
      <div style={styles.header}>
        <div style={styles.iconContainer}>
          <Activity size={32} color="var(--primary)" />
        </div>
        <h1 style={styles.title}>Dermatology AI System</h1>
        <p style={styles.subtitle}>Upload a skin image for AI-assisted classification</p>
      </div>

      {/* Main Card */}
      <div style={styles.card}>

        {/* Upload Area */}
        <div style={{ ...styles.uploadArea, ...(preview ? styles.uploadAreaHasContent : {}) }}>
          {!preview ? (
            <>
              <UploadCloud size={48} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ margin: "0 0 8px 0", fontWeight: 500 }}>Click to browse or drag image here</p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Supports JPG, PNG (Max 5MB)</p>
            </>
          ) : (
            <img src={preview} alt="preview" style={styles.previewImage} />
          )}
          {/* Overlaid invisible input */}
          <input
            type="file"
            accept="image/*"
            onChange={onPick}
            style={styles.fileInput}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={predict}
          disabled={!file || loading}
          style={{
            ...styles.button,
            opacity: (!file || loading) ? 0.6 : 1,
            cursor: (!file || loading) ? "not-allowed" : "pointer"
          }}
        >
          {loading ? (
            <>
              <Loader2 size={20} style={{ marginRight: 8 }} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            "Predict Disease"
          )}
        </button>

        {/* Results Area */}
        {result && (
          <div style={styles.resultContainer} className="animate-fade-in">
            <h3 style={styles.resultTitle}>Analysis Complete</h3>

            {(result.status === "uncertain" || result.rejected) ? (
              <div style={styles.warningBox}>
                <AlertCircle size={20} color="#ca8a04" style={{ marginRight: 12, flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: "0.95rem", color: "#854d0e", lineHeight: 1.5 }}>
                  <strong>Note:</strong> {result.rejection_reason || result.message}
                </p>
              </div>
            ) : (
              <>
                <div style={styles.primaryResult}>
                  <CheckCircle2 size={24} color="var(--success)" style={{ marginRight: 12 }} />
                  <div>
                    <p style={styles.resultLabel}>AI Prediction</p>
                    <div style={styles.predictionHighlight}>
                      <span style={styles.diseaseName}>{DISEASE_NAMES[result.predicted_class] || result.predicted_class}</span>
                      <span style={styles.confidenceBadge}>
                        {(result.confidence * 100).toFixed(1)}% Match
                      </span>
                    </div>
                  </div>
                </div>

                <h4 style={styles.top3Title}>Alternative Considerations</h4>
                <ul style={styles.top3List}>
                  {result.top3.map((t) => (
                    <li key={t.class} style={styles.top3Item}>
                      <span style={{ ...styles.top3Class, textTransform: 'none' }}>{DISEASE_NAMES[t.class] || t.class}</span>
                      <div style={styles.progressTrack}>
                        <div
                          style={{
                            ...styles.progressBar,
                            width: `${t.prob * 100}%`,
                            backgroundColor: t.class === result.predicted_class ? 'var(--primary)' : 'var(--text-muted)'
                          }}
                        />
                      </div>
                      <span style={styles.top3Prob}>{(t.prob * 100).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: 600,
    margin: "0 auto",
    padding: "20px"
  },
  header: {
    textAlign: "center",
    marginBottom: 32
  },
  iconContainer: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    marginBottom: 16
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--text-main)"
  },
  subtitle: {
    margin: 0,
    color: "var(--text-muted)",
    fontSize: "1rem"
  },
  card: {
    backgroundColor: "var(--card-bg)",
    borderRadius: "var(--radius)",
    padding: 32,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    border: "1px solid var(--border)"
  },
  uploadArea: {
    position: "relative",
    border: "2px dashed var(--border)",
    borderRadius: "var(--radius)",
    padding: "40px 20px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    overflow: "hidden"
  },
  uploadAreaHasContent: {
    border: "2px solid var(--border)",
    padding: 0,
    backgroundColor: "#000"
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer"
  },
  previewImage: {
    width: "100%",
    height: "100%",
    maxHeight: 300,
    objectFit: "contain",
    display: "block"
  },
  button: {
    width: "100%",
    padding: "14px 24px",
    backgroundColor: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: "1rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 24,
    fontSize: "0.9rem",
    border: "1px solid #fecaca"
  },
  warningBox: {
    display: "flex",
    alignItems: "flex-start",
    backgroundColor: "#fefce8",
    padding: "16px",
    borderRadius: 8,
    marginBottom: 24,
    border: "1px solid #fde047"
  },
  resultContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid var(--border)"
  },
  resultTitle: {
    margin: "0 0 20px 0",
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--text-main)"
  },
  primaryResult: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    padding: 20,
    borderRadius: 8,
    marginBottom: 24
  },
  resultLabel: {
    margin: "0 0 4px 0",
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600
  },
  predictionHighlight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  diseaseName: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-main)",
    textTransform: "uppercase"
  },
  confidenceBadge: {
    backgroundColor: "var(--success)",
    color: "white",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: "0.8rem",
    fontWeight: 600
  },
  top3Title: {
    margin: "0 0 16px 0",
    fontSize: "0.95rem",
    color: "var(--text-muted)",
    fontWeight: 600
  },
  top3List: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  top3Item: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  top3Class: {
    width: 140, // Increased width to fit full names
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-main)",
    textAlign: "left",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "var(--border)",
    borderRadius: 999,
    overflow: "hidden"
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
    transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  top3Prob: {
    width: 50,
    textAlign: "right",
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: 500
  }
};