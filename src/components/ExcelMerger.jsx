import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";

export default function ExcelMergerCSV() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);
  const [estimatedTotalSeconds, setEstimatedTotalSeconds] = useState(0);

  useEffect(() => {
    if (files.length === 0) setMessage("");
  }, [files]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setProgress(0);
    setStatus("");
    setTimeLeft("");
    setMessage("");
  };

  const fmt = (s) => {
    if (s <= 0) return "0s";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const mergeAndDownloadCSV = async () => {
    if (files.length === 0) {
      setMessage("Please select at least one ZIP file to upload.");
      return;
    }

    setLoading(true);
    setStatus("Uploading...");
    setProgress(2);
    setMessage("");

    const totalFiles = files.length;
    const estimatePerZip = 8;
    const estimateDownload = 4;
    setEstimatedTotalSeconds(totalFiles * estimatePerZip + estimateDownload);

    let elapsed = 0;

    // Create a CSV blob with headers, streaming data
    const headersWritten = false;
    const csvStream = [];

    const writeCsvRow = (row) => {
      const csvRow = row.map(cell => `"${cell}"`).join(",");
      csvStream.push(csvRow);
    };

    // Start the file processing
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      try {
        const zip = await JSZip.loadAsync(file);
        const excelFiles = Object.keys(zip.files).filter((name) =>
          name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls")
        );

        for (let fileName of excelFiles) {
          const fileData = await zip.files[fileName].async("arraybuffer");
          const workbook = XLSX.read(fileData);
          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            // Stream each row to the CSV
            json.forEach((row, rowIndex) => {
              const rowArray = Object.values(row);
              if (rowIndex === 0 && !headersWritten) {
                // Write headers if it's the first row
                writeCsvRow(Object.keys(row));
              }
              writeCsvRow(rowArray);
            });
          });
        }

        // Update progress
        const uploadPercent = 2 + Math.round(((i + 1) / totalFiles) * 58);
        setProgress(uploadPercent);

        elapsed += estimatePerZip;
        const remain = Math.max(0, totalFiles * estimatePerZip + estimateDownload - elapsed);
        setTimeLeft(`${fmt(remain)} left`);

        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error("Error processing file", file.name, err);
        setMessage((m) => m + `\nFailed to process ${file.name}`);
      }
    }

    // Now we are done merging, let's create the CSV file and download it
    setStatus("Downloading...");
    setProgress(62);

    // Join CSV rows and create the final CSV content
    const csvContent = csvStream.join("\n");

    // Create Blob for the final CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `merged_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatus("Completed!");
    setTimeLeft("Done");

    setTimeout(() => {
      setLoading(false);
      setProgress(0);
      setStatus("");
      setTimeLeft("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }, 1800);
  };

  const fileLabel = (f) => {
    if (!f) return "No file";
    const n = f.name || "untitled";
    return n.length > 28 ? n.slice(0, 24) + "..." : n;
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Excel → CSV <span style={{ color: "#8ab4f8" }}>Merger</span></h1>
        <p style={styles.subtitle}>Upload ZIP files with Excel sheets and merge into one CSV.</p>

        <label style={styles.dropArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={loading}
          />
          <div style={styles.dropContent}>
            <div style={styles.icon}>📦</div>
            <div>
              <div style={styles.dropText}>Select ZIP files</div>
              <div style={styles.dropHint}>Multiple ZIPs allowed. Each ZIP may have multiple Excel files.</div>
              <div style={styles.fileTags}>
                {files.length === 0 ? (
                  <div style={styles.fileTag}>No files chosen</div>
                ) : (
                  files.map((f, idx) => (
                    <div key={idx} style={styles.fileTag}>{fileLabel(f)}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </label>

        <div style={styles.actions}>
          <button onClick={mergeAndDownloadCSV} disabled={loading || files.length === 0} style={styles.uploadBtn}>
            {loading ? `${status}` : "Merge & Download CSV"}
          </button>
          <button
            onClick={() => { setFiles([]); setMessage(''); if (fileInputRef.current) fileInputRef.current.value = null; }}
            disabled={loading || files.length === 0}
            style={styles.clearBtn}
          >
            Clear
          </button>
          <div style={styles.fileCount}>{files.length} selected</div>
        </div>

        <div style={styles.progressWrapper}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
        </div>
        <div style={styles.progressInfo}>
          <span>{progress}%</span>
          <span>{status || (loading ? "Preparing..." : "Idle")}</span>
          <span>{timeLeft}</span>
        </div>

        {message && <div style={styles.message}>{message}</div>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(to bottom, #0f172a, #1e293b)",
    padding: 20,
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 600,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    color: "#fff",
 
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#a5b4fc",
    marginBottom: 20,
  },
  dropArea: {
    border: "2px dashed rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    cursor: "pointer",
  },
  dropContent: { display: "flex", gap: 15, alignItems: "center" },
  icon: { fontSize: 36 },
  dropText: { fontSize: 16, fontWeight: "bold" },
  dropHint: { fontSize: 12, color: "#cbd5e1", marginTop: 4 },
  fileTags: { marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 },
  fileTag: { fontSize: 12, padding: "4px 8px", background: "rgba(99,102,241,0.2)", borderRadius: 8 },
  actions: { display: "flex", alignItems: "center", gap: 10, marginTop: 20 },
  uploadBtn: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg,#4f46e5,#06b6d4)",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  clearBtn: {
    padding: "8px 14px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  fileCount: { marginLeft: "auto", fontSize: 12, color: "#cbd5e1" },
  progressWrapper: { width: "100%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 6, marginTop: 20, overflow: "hidden" },
  progressBar: { height: "100%", background: "linear-gradient(90deg,#7c3aed,#06b6d4)", transition: "width 0.3s" },
  progressInfo: { display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#e2e8f0" },
  message: { marginTop: 16, padding: 10, borderRadius: 8, background: "rgba(251,191,36,0.2)", color: "#fcd34d", fontSize: 12 },
};
