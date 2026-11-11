import TriangleGridSvg from './TriangleGridSvg'
import DominoChainSvg from './DominoChainSvg'
import RectCardsSvg from './RectCardsSvg'
import SquareGridSvg from './SquareGridSvg'
import PolygonTilingSvg from './PolygonTilingSvg'

export default function PuzzleView({ layout, pairs }) {
  switch (layout.shape) {
    case 'triangle':
      return <TriangleGridSvg layout={layout} pairs={pairs} />
    case 'domino-chain':
      return <DominoChainSvg layout={layout} pairs={pairs} />
    case 'rect-cards':
      return <RectCardsSvg layout={layout} pairs={pairs} />
    case 'square-grid':
      return <SquareGridSvg layout={layout} pairs={pairs} />
    case 'polygon-tiling':
      return <PolygonTilingSvg layout={layout} pairs={pairs} />
    default:
      return <p>Unsupported layout shape: {layout.shape}</p>
  }
}
