/**
 * CSV Ingestion & Parsing Engine
 * Uses PapaParse CDN to parse file uploads asynchronously.
 */

function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("No file provided.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: function (results) {
        if (results.errors.length > 0) {
          console.warn("CSV Parsing Warnings/Errors:", results.errors);
        }
        
        // Normalize headers to standard key names
        const normalizedData = results.data.map((item, index) => ({
          id: item.id || index + 1,
          source: item.source || item.Source || "CSV Import",
          customer_name: item.customer_name || item.Name || "Anonymous",
          feedback_text: item.feedback_text || item.Feedback || item.text || "",
          date: item.date || item.Date || new Date().toISOString().split('T')[0]
        }));

        resolve(normalizedData);
      },
      error: function (error) {
        reject(error);
      }
    });
  });
}