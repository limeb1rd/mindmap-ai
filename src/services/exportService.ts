import React from 'react';
import { MindMapData, MindMapNode } from '../types';

export class ExportService {
  static async exportAsPng() {
    const { toPng } = await import('html-to-image');
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (element) {
      const dataUrl = await toPng(element, { backgroundColor: '#f8fafc', quality: 1 });
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  }

  static async exportAsSvg() {
    const { toSvg } = await import('html-to-image');
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (element) {
      const dataUrl = await toSvg(element, { backgroundColor: '#f8fafc' });
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    }
  }

  static async exportAsJson(data: MindMapData) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `mindmap-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  static async exportAsPdf(
    mindMapData: MindMapData, 
    exportRef: React.RefObject<HTMLDivElement>,
    setExportNode: (node: MindMapNode | null) => void
  ) {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;

    const [
      { toPng },
      { jsPDF }
    ] = await Promise.all([
      import('html-to-image'),
      import('jspdf')
    ]);

    const mapDataUrl = await toPng(element, { backgroundColor: '#f8fafc', quality: 1 });
    
    const pdf = new jsPDF({
      orientation: 'l',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const mapImgWidth = pageWidth;
    const mapImgHeight = (element.offsetHeight * mapImgWidth) / element.offsetWidth;
    const yOffset = mapImgHeight < pageHeight ? (pageHeight - mapImgHeight) / 2 : 0;
    pdf.addImage(mapDataUrl, 'PNG', 0, yOffset, mapImgWidth, mapImgHeight);

    const nodesWithMetadata: MindMapNode[] = [];
    const traverse = (node: MindMapNode) => {
      if (node.metadata && (node.metadata.description || node.metadata.importance || node.metadata.detailedBiography)) {
        nodesWithMetadata.push(node);
      }
      node.children?.forEach(traverse);
    };

    // Correctly start traversal from children of MindMapData
    mindMapData.children.forEach(traverse);

    for (const node of nodesWithMetadata) {
      setExportNode(node);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (exportRef.current) {
        const cardUrl = await toPng(exportRef.current, { backgroundColor: '#ffffff', quality: 1 });
        pdf.addPage([210, 297], 'p');
        const cardWidth = 210;
        const cardHeight = (exportRef.current.offsetHeight * cardWidth) / exportRef.current.offsetWidth;
        pdf.addImage(cardUrl, 'PNG', 0, 0, cardWidth, cardHeight > 297 ? 297 : cardHeight);
      }
    }

    pdf.save(`mindmap-full-${Date.now()}.pdf`);
    setExportNode(null);
  }
}
