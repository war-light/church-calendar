import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import React, { useState } from "react";

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  monthLabel?: string;
  editMode?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  targetRef,
  monthLabel,
  editMode = false,
  onEditModeChange,
}) => {
  const [exporting, setExporting] = useState(false);

  const waitForRender = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

  const handleExport = async () => {
    if (!targetRef.current) return;

    const wasInEditMode = editMode;
    if (wasInEditMode && onEditModeChange) {
      onEditModeChange(false);
      await waitForRender();
    }

    try {
      setExporting(true);
      // Generate high quality PNG
      const dataUrl = await toPng(targetRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#0f172a", // slate-900
      });

      const cleanMonth = monthLabel
        ? monthLabel.replace(/[^a-zA-Z0-9]/g, "_")
        : "Schedule";
      const filename = `Church_Calendar_${cleanMonth}.png`;

      // Trigger download
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export PNG calendar image:", err);
      alert("Failed to generate PNG image. Please try again.");
    } finally {
      setExporting(false);
      if (wasInEditMode && onEditModeChange) {
        onEditModeChange(true);
      }
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={exporting}
      title="Download calendar schedule as PNG image"
      className="gap-2 rounded-xl text-xs font-semibold shadow-xs"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span>{exporting ? "Exporting..." : "Export PNG"}</span>
    </Button>
  );
};
