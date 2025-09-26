import React, { useState } from "react";
import * as XLSX from "xlsx";

const ExcelMergerCSV = () => {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(""); // "Uploading..." / "Downloading..."
  const [timeLeft, setTimeLeft] = useState("");

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setProgress(0);
    setStatus("");
    setTimeLeft("");
  };

  const mergeAndDownloadCSV = async () => {
    if (files.length === 0) {
      alert("Please select at least one Excel file!");
      return;
    }

    setStatus("Uploading...");
    const totalFiles = files.length;
    let mergedData = [];

    // Simulate upload with estimated time
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetNames = workbook.SheetNames;

      sheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        mergedData = mergedData.concat(json);
      });

      const uploadPercent = Math.round(((i + 1) / totalFiles) * 50);
      setProgress(uploadPercent);

      // simulate time left (e.g., 50% = half of total estimated 2 minutes)
      const remainingSec = Math.max(0, Math.round((50 - uploadPercent) / 50 * 120));
      setTimeLeft(`${remainingSec} sec to go`);

      await new Promise((r) => setTimeout(r, 500)); // animation delay
    }

    setStatus("Downloading...");
    setTimeLeft("30 sec to go"); // initial estimate for download
    setProgress(50);

    // Convert JSON to CSV
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(mergedData));

    // Simulate download progress animation
    for (let i = 50; i <= 100; i++) {
      setProgress(i);
      const remainingSec = Math.max(0, Math.round((100 - i) / 50 * 30));
      setTimeLeft(`${remainingSec} sec to go`);
      await new Promise((r) => setTimeout(r, 100));
    }

    // Trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "merged_file.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Reset progress
    setStatus("Completed!");
    setTimeout(() => {
      setProgress(0);
      setStatus("");
      setTimeLeft("");
    }, 2000);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Excel to CSV Merger</h1>

      <input
        type="file"
        accept=".xlsx,.xls"
        multiple
        onChange={handleFileChange}
        style={styles.fileInput}
        disabled={progress > 0}
      />

      <button
        onClick={mergeAndDownloadCSV}
        style={{
          ...styles.button,
          backgroundColor: progress > 0 ? "#888" : "#3b82f6",
        }}
        disabled={progress > 0}
      >
        {progress > 0 ? status : "Merge & Download CSV"}
      </button>

      {files.length > 0 && <p>{files.length} file(s) selected</p>}

      {progress > 0 && (
        <div style={styles.progressBarContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progress}%`,
            }}
          >
            {progress}% - {timeLeft}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelMergerCSV;

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: 20,
    backgroundColor: "#f1f5f9",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1e40af",
  },
  fileInput: {
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 8,
    marginBottom: 15,
    width: 300,
  },
  button: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  progressBarContainer: {
    width: 300,
    height: 30,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    marginTop: 20,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3b82f6",
    color: "#fff",
    textAlign: "center",
    lineHeight: "30px",
    fontWeight: "bold",
    transition: "width 0.3s",
  },
};
