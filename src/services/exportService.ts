import React from 'react';
import { getNodesBounds, getViewportForBounds, ReactFlowInstance } from '@xyflow/react';
import { MindMapData, MindMapNode } from '../types';

export class ExportService {
  private static async prepareViewport(rfInstance: ReactFlowInstance) {
    const nodes = rfInstance.getNodes();
    const element = document.querySelector('.react-flow-viewport') as HTMLElement;
    const container = document.querySelector('.react-flow') as HTMLElement;
    
    if (!container || nodes.length === 0) return null;

    const currentViewport = rfInstance.getViewport();
    const nodesBounds = getNodesBounds(nodes);
    
    const padding = 60;
    const viewport = getViewportForBounds(
      nodesBounds,
      container.offsetWidth,
      container.offsetHeight,
      0.05,
      2,
      padding
    );

    rfInstance.setViewport(viewport);
    
    // Wait for React Flow to update internal state and styles
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      restore: () => rfInstance.setViewport(currentViewport),
      container,
      width: container.offsetWidth,
      height: container.offsetHeight
    };
  }

  static async exportAsPng(rfInstance: ReactFlowInstance) {
    const { toPng } = await import('html-to-image');
    const prepared = await this.prepareViewport(rfInstance);
    if (!prepared) return;

    const { container, width, height, restore } = prepared;
    
    try {
      const maxDim = 8000;
      const pixelRatio = Math.min(2, maxDim / Math.max(width, height));

      const dataUrl = await toPng(container, { 
        backgroundColor: '#f8fafc', 
        quality: 1,
        pixelRatio
      });
      
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      restore();
    }
  }

  static async exportAsSvg(rfInstance: ReactFlowInstance) {
    const { toSvg } = await import('html-to-image');
    const prepared = await this.prepareViewport(rfInstance);
    if (!prepared) return;

    const { container, restore } = prepared;
    
    try {
      const dataUrl = await toSvg(container, { backgroundColor: '#f8fafc' });
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      restore();
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
    rfInstance: ReactFlowInstance,
    exportRef: React.RefObject<HTMLDivElement | null>,
    setExportNode: (node: MindMapNode | null) => void
  ) {
    const prepared = await this.prepareViewport(rfInstance);
    if (!prepared) return;

    const { container, width, height, restore } = prepared;

    try {
      const [
        { toPng },
        { jsPDF }
      ] = await Promise.all([
        import('html-to-image'),
        import('jspdf')
      ]);

      const maxDim = 8000;
      const pixelRatio = Math.min(2, maxDim / Math.max(width, height));

      const mapDataUrl = await toPng(container, { 
        backgroundColor: '#f8fafc', 
        quality: 1,
        pixelRatio
      });
      
      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const mapImgWidth = pageWidth;
      const mapImgHeight = (height * mapImgWidth) / width;
      const yOffset = mapImgHeight < pageHeight ? (pageHeight - mapImgHeight) / 2 : 0;
      pdf.addImage(mapDataUrl, 'PNG', 0, yOffset, mapImgWidth, Math.min(pageHeight, mapImgHeight));

      const nodesWithMetadata: MindMapNode[] = [];
      const traverse = (node: MindMapNode) => {
        if (node.metadata && (node.metadata.description || node.metadata.importance || node.metadata.detailedBiography)) {
          nodesWithMetadata.push(node);
        }
        node.children?.forEach(traverse);
      };

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
    } catch (err) {
      console.error('PDF export failed', err);
    } finally {
      setExportNode(null);
      restore();
    }
  }
}
