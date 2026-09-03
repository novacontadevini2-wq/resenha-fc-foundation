import { jsPDF } from "jspdf";
import type { DrawPlayerSnapshot } from "@/components/draws/TeamCard";

const overallMap: Record<number, number> = { 1: 50, 2: 65, 3: 75, 4: 85, 5: 93 };

const NAVY: [number, number, number] = [10, 35, 66];
const ORANGE: [number, number, number] = [232, 106, 33];
const LIGHT: [number, number, number] = [241, 244, 249];

async function toDataUrl(
  url: string,
  options: { maxSize?: number; quality?: number; keepAlpha?: boolean } = {},
): Promise<{ data: string; format: string; width: number; height: number } | null> {
  const { maxSize = 900, quality = 0.72, keepAlpha = false } = options;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();

    // Downscale + re-encode to keep the PDF small.
    try {
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        if (!keepAlpha) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();
        if (keepAlpha) return { data: canvas.toDataURL("image/png"), format: "PNG", width, height };
        return { data: canvas.toDataURL("image/jpeg", quality), format: "JPEG", width, height };
      }
      bitmap.close?.();
    } catch {
      // fall back to raw embed below
    }

    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const format = blob.type.includes("png") ? "PNG" : "JPEG";
    return { data, format, width: 1, height: 1 };
  } catch {
    return null;
  }
}


function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export interface DrawPdfTeam {
  teamNumber: number;
  totalRating: number;
  players: DrawPlayerSnapshot[];
}

export async function exportDrawTeamsPdf({
  teams,
  subtitle,
  fileName = "sorteio-resenha-fc.pdf",
}: {
  teams: DrawPdfTeam[];
  subtitle?: string;
  fileName?: string;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const logo = await toDataUrl("/logotipo%20resenha%20fc.png", { maxSize: 256, keepAlpha: true });
  const photoCache = new Map<string, { data: string; format: string; width: number; height: number } | null>();
  for (const team of teams) {
    for (const player of team.players) {
      const url = player.photo_url_snapshot;
      if (url && !photoCache.has(url)) photoCache.set(url, await toDataUrl(url, { maxSize: 700, quality: 0.65 }));
    }
  }

  teams.forEach((team, index) => {
    if (index > 0) doc.addPage();

    // Top brand bars
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 4, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(0, 4, pageW, 2, "F");

    const marginX = 14;
    let cursorY = 16;

    if (logo) doc.addImage(logo.data, logo.format, marginX, cursorY, 22, 22);

    doc.setTextColor(120, 130, 145);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SORTEIO DE TIMES", marginX + 28, cursorY + 7);

    doc.setTextColor(...NAVY);
    doc.setFontSize(30);
    doc.text(`TIME ${team.teamNumber}`, marginX + 28, cursorY + 20);

    // Force badge
    const badgeW = 52;
    const badgeH = 22;
    const badgeX = pageW - marginX - badgeW;
    doc.setFillColor(...NAVY);
    doc.roundedRect(badgeX, cursorY, badgeW, badgeH, 2, 2, "F");
    doc.setTextColor(...ORANGE);
    doc.setFontSize(8);
    doc.text("FORÇA", badgeX + badgeW - 6, cursorY + 8, { align: "right" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(team.totalRating.toFixed(1), badgeX + badgeW - 6, cursorY + 18, { align: "right" });

    cursorY += 28;
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.6);
    doc.line(marginX, cursorY, pageW - marginX, cursorY);

    // Player cards
    const players = team.players;
    const count = Math.max(players.length, 1);
    const gap = 6;
    const cardsTop = cursorY + 8;
    const cardsBottom = pageH - 22;
    const cardH = cardsBottom - cardsTop;
    const cardW = (pageW - marginX * 2 - gap * (count - 1)) / count;

    players.forEach((player, i) => {
      const x = marginX + i * (cardW + gap);
      doc.setFillColor(...LIGHT);
      doc.roundedRect(x, cardsTop, cardW, cardH, 3, 3, "F");

      const photoPad = 6;
      const photoW = cardW - photoPad * 2;
      const photoH = cardH * 0.62;
      const photo = player.photo_url_snapshot ? photoCache.get(player.photo_url_snapshot) : null;
      if (photo) {
        doc.addImage(photo.data, photo.format, x + photoPad, cardsTop + photoPad, photoW, photoH, undefined, "FAST");
      } else {
        doc.setFillColor(...NAVY);
        doc.roundedRect(x + photoPad, cardsTop + photoPad, photoW, photoH, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(34);
        doc.text(
          initials(player.player_name_snapshot) || "RF",
          x + cardW / 2,
          cardsTop + photoPad + photoH / 2 + 6,
          { align: "center" },
        );
      }

      let textY = cardsTop + photoPad + photoH + 12;
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text(String(overallMap[Math.round(player.rating_snapshot)] ?? overallMap[1]), x + photoPad, textY);

      doc.setTextColor(...ORANGE);
      doc.setFontSize(9);
      doc.text(player.position_code_snapshot?.toUpperCase() ?? "RF", x + photoPad, textY + 6);

      textY += 12;
      doc.setDrawColor(...ORANGE);
      doc.setLineWidth(0.8);
      doc.line(x + photoPad, textY, x + photoPad + 10, textY);

      doc.setTextColor(...NAVY);
      doc.setFontSize(12);
      const name = doc.splitTextToSize(player.player_name_snapshot, cardW - photoPad * 2)[0] ?? "";
      doc.text(name, x + photoPad, textY + 7);
    });

    // Footer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(
      `RESENHA FUTEBOL CLUBE${subtitle ? ` · ${subtitle.toUpperCase()}` : ""}`,
      marginX,
      pageH - 10,
    );
    doc.text(`${players.length} JOGADORES`, pageW - marginX, pageH - 10, { align: "right" });

    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 4, pageW, 4, "F");
  });

  doc.save(fileName);
  return doc;
}
