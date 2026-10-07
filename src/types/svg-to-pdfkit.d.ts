// svg-to-pdfkit ships without types: the one call this app makes.
declare module "svg-to-pdfkit" {
  const SVGtoPDF: (
    doc: PDFKit.PDFDocument,
    svg: string,
    x: number,
    y: number,
    options?: { width?: number; height?: number; assumePt?: boolean; fontCallback?: (family: string, bold: boolean, italic: boolean) => string }
  ) => void;
  export default SVGtoPDF;
}
