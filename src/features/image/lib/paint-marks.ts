/** Draws markup (arrows, boxes, text…) onto a canvas at the image's full size, matching the on-screen preview. */
import type { EditorItem } from '@/features/pdf/lib/editor-items';
import {
  arrowGeometry,
  stepText,
  TEXT_BASELINE,
  TEXT_LINE_HEIGHT,
} from '@/features/pdf/lib/overlay';

const FONT = 'Helvetica, Arial, "Liberation Sans", sans-serif';

function ellipse(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  context.beginPath();
  context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
}

export function paintMarks(context: CanvasRenderingContext2D, items: EditorItem[]) {
  for (const item of items) {
    context.save();
    switch (item.kind) {
      case 'rect':
      case 'ellipse': {
        if (item.kind === 'rect') {
          context.beginPath();
          context.rect(item.x, item.y, item.w, item.h);
        } else {
          ellipse(context, item.x, item.y, item.w, item.h);
        }
        if (item.fill) {
          context.fillStyle = item.fill;
          context.fill();
        }
        if (item.strokeWidth > 0) {
          context.strokeStyle = item.color;
          context.lineWidth = item.strokeWidth;
          context.stroke();
        }
        break;
      }
      case 'highlight':
        context.globalCompositeOperation = 'multiply';
        context.fillStyle = item.color;
        context.fillRect(item.x, item.y, item.w, item.h);
        break;
      case 'mark': {
        const { x, y, w, h } = item;
        context.strokeStyle = item.color;
        context.lineWidth = Math.max(1, Math.min(w, h) * 0.14);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        if (item.mark === 'check') {
          context.moveTo(x + w * 0.12, y + h * 0.55);
          context.lineTo(x + w * 0.38, y + h * 0.82);
          context.lineTo(x + w * 0.88, y + h * 0.18);
        } else {
          context.moveTo(x + w * 0.15, y + h * 0.15);
          context.lineTo(x + w * 0.85, y + h * 0.85);
          context.moveTo(x + w * 0.85, y + h * 0.15);
          context.lineTo(x + w * 0.15, y + h * 0.85);
        }
        context.stroke();
        break;
      }
      case 'line': {
        context.strokeStyle = item.color;
        context.fillStyle = item.color;
        context.lineWidth = item.strokeWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(item.x1, item.y1);
        if (item.arrow) {
          const { shaftEnd, head } = arrowGeometry(item.x1, item.y1, item.x2, item.y2, item.strokeWidth);
          context.lineTo(shaftEnd[0], shaftEnd[1]);
          context.stroke();
          context.beginPath();
          context.moveTo(head[0][0], head[0][1]);
          context.lineTo(head[1][0], head[1][1]);
          context.lineTo(head[2][0], head[2][1]);
          context.closePath();
          context.fill();
        } else {
          context.lineTo(item.x2, item.y2);
          context.stroke();
        }
        break;
      }
      case 'pen': {
        const [first, ...rest] = item.points;
        if (!first) break;
        context.strokeStyle = item.color;
        context.lineWidth = item.strokeWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(first[0], first[1]);
        // A single tap still leaves a dot.
        if (!rest.length) context.lineTo(first[0], first[1]);
        for (const [px, py] of rest) context.lineTo(px, py);
        context.stroke();
        break;
      }
      case 'step': {
        const text = stepText(item, item.number);
        context.fillStyle = item.color;
        ellipse(context, item.x, item.y, item.w, item.h);
        context.fill();
        context.fillStyle = '#fff';
        context.font = `${text.size}px ${FONT}`;
        context.textBaseline = 'alphabetic';
        context.fillText(String(item.number), text.x, text.baseline);
        break;
      }
      case 'text': {
        context.fillStyle = item.color;
        context.font = `${item.size}px ${FONT}`;
        context.textBaseline = 'alphabetic';
        item.text.split('\n').forEach((line, index) => {
          context.fillText(
            line,
            item.x,
            item.y + item.size * TEXT_BASELINE + index * item.size * TEXT_LINE_HEIGHT,
          );
        });
        break;
      }
      default:
        break;
    }
    context.restore();
  }
}

