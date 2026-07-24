import * as React from 'react'

import { useEngine } from '@/lib/engine/store'
import { viewportToScene } from '@/lib/engine/coords'
import {
  elementsAtPoint,
  groupHitAt,
  hitTest,
  marqueeHits,
} from '@/lib/engine/hit-test'
import {
  createFreedraw,
  createLinear,
  createShape,
  createText,
  erasePointBased,
  normalizeElement,
  outlineElement,
} from '@/lib/engine/factory'
import {
  arrowWorldPoints,
  bindingForPoint,
  isBindableElement,
  pointForBinding,
  refreshBoundArrows,
  setArrowEndpoints,
} from '@/lib/engine/bindings'
import { canvasBackground, gridColor } from '@/lib/engine/theme-defaults'
import { hasPoints, type DuckElement, type Point } from '@/lib/engine/types'
import { ElementNode } from '@/lib/engine/render/renderElement'
import {
  anchorFor,
  handleAxes,
  handlePositions,
  rotationHandlePos,
  selectionBounds,
  type Handle,
  type Interaction,
} from './interaction'
import { SelectionActions } from './SelectionActions'
import { SelectionOverlay } from './SelectionOverlay'
import { TextEditor } from './TextEditor'

const HIT_PX = 8
const HANDLE_GRAB_PX = 10
const MIN_ZOOM = 0.1
const MAX_ZOOM = 30

/** All element ids that move together with the given element (its group, or itself). */
function groupIdsFor(el: DuckElement, all: DuckElement[]): string[] {
  if (el.groupIds.length) {
    const gid = el.groupIds[el.groupIds.length - 1]
    return all.filter((e) => e.groupIds.includes(gid)).map((e) => e.id)
  }
  return [el.id]
}

function idSet(ids: string[]): Record<string, true> {
  return Object.fromEntries(ids.map((id) => [id, true]))
}

function bindableTargetAt(
  elements: DuckElement[],
  point: Point,
  tol: number,
  excludedIds: Set<string> = new Set(),
): DuckElement | undefined {
  return elementsAtPoint(elements, point, tol).find(
    (el) => !excludedIds.has(el.id) && isBindableElement(el),
  )
}

function cursorForHandle(handle: Handle): string {
  switch (handle) {
    case 'n':
    case 's':
      return 'ns-resize'
    case 'e':
    case 'w':
      return 'ew-resize'
    case 'nw':
    case 'se':
      return 'nwse-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
  }
}

/** Rotate a point around a center by `angle` radians. */
function rotateAround(p: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = p[0] - center[0]
  const dy = p[1] - center[1]
  return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos]
}

/** Scale one element about an anchor by independent x/y factors. */
function scaleElement(
  el: DuckElement,
  anchor: Point,
  fx: number,
  fy: number,
): DuckElement {
  const nx = anchor[0] + (el.x - anchor[0]) * fx
  const ny = anchor[1] + (el.y - anchor[1]) * fy
  const next: DuckElement = {
    ...el,
    x: nx,
    y: ny,
    width: Math.max(1, el.width * fx),
    height: Math.max(1, el.height * fy),
  }
  if (hasPoints(next)) {
    next.points = next.points.map(([px, py]) => [px * fx, py * fy])
  }
  if (next.type === 'text') {
    next.fontSize = Math.max(6, next.fontSize * ((fx + fy) / 2))
  }
  return next
}

export function Board() {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const interaction = React.useRef<Interaction>({ kind: 'none' })
  const spaceDown = React.useRef(false)
  const pointerId = React.useRef<number | null>(null)

  const elements = useEngine((s) => s.elements)
  const camera = useEngine((s) => s.camera)
  const selectedIds = useEngine((s) => s.selectedIds)
  const activeTool = useEngine((s) => s.activeTool)
  const theme = useEngine((s) => s.theme)
  const editingTextId = useEngine((s) => s.editingTextId)
  const viewport = useEngine((s) => s.viewport)
  const eraserSize = useEngine((s) => s.eraserSize)

  // Guide circle following the cursor while the eraser is active (scene coords).
  const [eraserCursor, setEraserCursor] = React.useState<Point | null>(null)
  const [selectionCursor, setSelectionCursor] = React.useState('default')
  React.useEffect(() => {
    if (activeTool !== 'eraser') setEraserCursor(null)
    if (activeTool !== 'select') setSelectionCursor('default')
  }, [activeTool])

  const [marquee, setMarquee] = React.useState<{
    x1: number
    y1: number
    x2: number
    y2: number
  } | null>(null)

  const live = React.useMemo(() => elements.filter((e) => !e.isDeleted), [elements])

  // Keep the viewport size in the store (for scrollToContent / centering).
  React.useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      useEngine.getState().setViewport(r.width, r.height)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Convert a pointer event to scene coordinates.
  const toScene = React.useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const r = svgRef.current!.getBoundingClientRect()
      const cam = useEngine.getState().camera
      return viewportToScene(e.clientX - r.left, e.clientY - r.top, cam)
    },
    [],
  )

  const patch = React.useCallback(
    (fn: (el: DuckElement) => DuckElement, match: (el: DuckElement) => boolean) => {
      const s = useEngine.getState()
      s.setElements(
        refreshBoundArrows(s.elements.map((el) => (match(el) ? fn(el) : el))),
      )
    },
    [],
  )

  const eraseAt = React.useCallback((scene: Point) => {
    const s = useEngine.getState()
    const radius = s.eraserSize / s.camera.zoom

    // Object mode: touching an element removes the whole object (and its group).
    if (s.eraserMode === 'object') {
      const live = s.elements.filter((el) => !el.isDeleted)
      const hit = elementsAtPoint(live, scene, radius)[0] ?? groupHitAt(live, scene)
      if (!hit) return
      const toDelete = new Set(groupIdsFor(hit, s.elements))
      s.setElements(
        s.elements.map((el) =>
          toDelete.has(el.id) ? { ...el, isDeleted: true } : el,
        ),
      )
      return
    }

    // Stroke mode: trim point-based strokes; whole-delete closed shapes on touch.
    let changed = false
    const next: DuckElement[] = []
    for (const el of s.elements) {
      if (el.isDeleted) {
        next.push(el)
        continue
      }
      if (hasPoints(el)) {
        const pieces = erasePointBased(el, scene, radius)
        if (pieces.length === 1 && pieces[0] === el) {
          next.push(el)
        } else {
          changed = true
          next.push(...pieces)
        }
      } else if (
        el.type === 'rectangle' ||
        el.type === 'ellipse' ||
        el.type === 'diamond'
      ) {
        // Trim the outline like a stroke: touch an edge, cut just that bit.
        const outline = outlineElement(el)
        const pieces = erasePointBased(outline, scene, radius)
        if (pieces.length === 1 && pieces[0] === outline) {
          next.push(el) // outline untouched — keep the pristine shape
        } else {
          changed = true
          next.push(...pieces)
        }
      } else if (hitTest(el, scene, radius)) {
        // Other elements (text): whole-delete on touch.
        changed = true
        next.push({ ...el, isDeleted: true })
      } else {
        next.push(el)
      }
    }
    if (changed) s.setElements(next)
  }, [])

  const updateSelectionCursor = React.useCallback((scene: Point) => {
    const s = useEngine.getState()
    const box = selectionBounds(
      s.elements.filter((el) => !el.isDeleted),
      s.selectedIds,
    )
    if (!box) {
      setSelectionCursor('default')
      return
    }

    const grab = HANDLE_GRAB_PX / s.camera.zoom
    const selected = s.elements.filter((el) => s.selectedIds[el.id])
    const selectedArrow =
      selected.length === 1 && selected[0].type === 'arrow'
        ? selected[0]
        : undefined
    if (selectedArrow) {
      const points = arrowWorldPoints(selectedArrow)
      const endpoints = [points[0], points[points.length - 1]]
      if (
        endpoints.some(
          (point) => Math.hypot(scene[0] - point[0], scene[1] - point[1]) <= grab * 1.5,
        )
      ) {
        setSelectionCursor('crosshair')
        return
      }
    }

    const [rx, ry] = rotationHandlePos(box, s.camera.zoom)
    if (Math.hypot(scene[0] - rx, scene[1] - ry) <= grab) {
      setSelectionCursor('grab')
      return
    }

    for (const [name, point] of Object.entries(handlePositions(box))) {
      if (Math.hypot(scene[0] - point[0], scene[1] - point[1]) <= grab) {
        setSelectionCursor(cursorForHandle(name as Handle))
        return
      }
    }
    setSelectionCursor('default')
  }, [])

  // ---- Wheel: zoom (ctrl/pinch) or pan (trackpad) ----
  const onWheel = React.useCallback((e: React.WheelEvent) => {
    const s = useEngine.getState()
    if (e.ctrlKey || e.metaKey) {
      const r = svgRef.current!.getBoundingClientRect()
      const px = e.clientX - r.left
      const py = e.clientY - r.top
      const cam = s.camera
      const [sx, sy] = viewportToScene(px, py, cam)
      let zoom = cam.zoom * Math.exp(-e.deltaY * 0.0015)
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
      // Keep the point under the cursor fixed.
      s.setCamera({
        zoom,
        scrollX: px / zoom - sx,
        scrollY: py / zoom - sy,
      })
    } else {
      const cam = s.camera
      s.setCamera({
        scrollX: cam.scrollX - e.deltaX / cam.zoom,
        scrollY: cam.scrollY - e.deltaY / cam.zoom,
      })
    }
  }, [])

  // ---- Pointer down ----
  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return
      const s = useEngine.getState()
      // A pointerdown while editing text just commits it (via the textarea blur);
      // don't also start a new gesture (e.g. create another text box).
      if (s.editingTextId) return
      const tool = s.activeTool
      const scene = toScene(e)
      svgRef.current?.setPointerCapture(e.pointerId)
      pointerId.current = e.pointerId

      const wantPan =
        tool === 'hand' || spaceDown.current || e.button === 1
      if (wantPan) {
        interaction.current = {
          kind: 'panning',
          startClient: [e.clientX, e.clientY],
          startScroll: [s.camera.scrollX, s.camera.scrollY],
        }
        return
      }

      const tol = HIT_PX / s.camera.zoom

      if (tool === 'select') {
        // 1) resize handle of the current selection?
        const box = selectionBounds(s.elements.filter((el) => !el.isDeleted), s.selectedIds)
        if (box) {
          const grab = HANDLE_GRAB_PX / s.camera.zoom
          const selected = s.elements.filter((el) => s.selectedIds[el.id])
          const selectedArrow =
            selected.length === 1 && selected[0].type === 'arrow'
              ? selected[0]
              : undefined
          if (selectedArrow) {
            const points = arrowWorldPoints(selectedArrow)
            const endpoints: Array<'start' | 'end'> = ['start', 'end']
            for (const [index, endpoint] of endpoints.entries()) {
              const point = points[index === 0 ? 0 : points.length - 1]
              if (Math.hypot(scene[0] - point[0], scene[1] - point[1]) <= grab * 1.5) {
                s.pushHistory()
                interaction.current = {
                  kind: 'binding-arrow-endpoint',
                  id: selectedArrow.id,
                  endpoint,
                  orig: selectedArrow,
                }
                return
              }
            }
          }
          // rotation handle first
          const [rhx, rhy] = rotationHandlePos(box, s.camera.zoom)
          if (Math.hypot(scene[0] - rhx, scene[1] - rhy) <= grab) {
            s.pushHistory()
            const center: Point = [box.x + box.w / 2, box.y + box.h / 2]
            interaction.current = {
              kind: 'rotating',
              center,
              startAngle: Math.atan2(scene[1] - center[1], scene[0] - center[0]),
              orig: s.elements.filter((el) => s.selectedIds[el.id]),
            }
            return
          }
          const handles = handlePositions(box)
          for (const [name, pos] of Object.entries(handles)) {
            if (Math.hypot(scene[0] - pos[0], scene[1] - pos[1]) <= grab) {
              s.pushHistory()
              interaction.current = {
                kind: 'resizing',
                handle: name as Handle,
                anchor: anchorFor(name as Handle, box),
                origBox: box,
                orig: s.elements.filter((el) => s.selectedIds[el.id]),
              }
              return
            }
          }
        }

        // 2) hit an element? (fall back to a group's bounding box so stencils
        //    built from open lines are selectable by clicking their interior)
        const liveEls = s.elements.filter((el) => !el.isDeleted)
        const hit = elementsAtPoint(liveEls, scene, tol)[0] ?? groupHitAt(liveEls, scene)
        if (hit) {
          let selection = s.selectedIds
          if (!s.selectedIds[hit.id]) {
            const ids = groupIdsFor(hit, s.elements)
            selection = e.shiftKey
              ? { ...s.selectedIds, ...idSet(ids) }
              : idSet(ids)
            s.setSelected(selection)
          }
          s.pushHistory()
          const orig = new Map<string, Point>()
          for (const el of s.elements) {
            if (selection[el.id]) orig.set(el.id, [el.x, el.y])
          }
          interaction.current = { kind: 'translating', start: scene, orig }
          return
        }

        // 3) empty space → marquee
        if (!e.shiftKey) s.setSelected({})
        interaction.current = { kind: 'marquee', start: scene }
        setMarquee({ x1: scene[0], y1: scene[1], x2: scene[0], y2: scene[1] })
        return
      }

      if (tool === 'eraser') {
        s.pushHistory()
        eraseAt(scene)
        interaction.current = { kind: 'erasing' }
        return
      }

      if (tool === 'text') {
        e.preventDefault()
        s.pushHistory()
        const el = createText(scene, s.defaults)
        s.setElements([...s.elements, el])
        s.setSelected({})
        s.setEditingText(el.id)
        return
      }

      if (tool === 'freedraw') {
        s.pushHistory()
        const el = createFreedraw(scene, s.defaults)
        s.setElements([...s.elements, el])
        interaction.current = { kind: 'freedrawing', id: el.id, origin: scene }
        return
      }

      if (tool === 'line' || tool === 'arrow') {
        s.pushHistory()
        const created = createLinear(tool, scene, s.defaults)
        const sourceTarget =
          tool === 'arrow'
            ? bindableTargetAt(
                s.elements.filter((el) => !el.isDeleted),
                scene,
                tol,
              )
            : undefined
        const el =
          created.type === 'arrow' && sourceTarget
            ? {
                ...created,
                startBinding: bindingForPoint(sourceTarget, [scene[0] + 1, scene[1]]),
              }
            : created
        s.setElements(refreshBoundArrows([...s.elements, el]))
        interaction.current = { kind: 'creating', id: el.id, start: scene }
        return
      }

      // rectangle / ellipse / diamond
      s.pushHistory()
      const el = createShape(tool, scene, s.defaults)
      s.setElements([...s.elements, el])
      interaction.current = { kind: 'creating', id: el.id, start: scene }
    },
    [toScene, patch, eraseAt],
  )

  // ---- Pointer move ----
  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      const s = useEngine.getState()
      const it = interaction.current
      const scene = toScene(e)
      if (useEngine.getState().activeTool === 'eraser') {
        setEraserCursor(scene)
      }
      if (it.kind === 'none') {
        if (s.activeTool === 'select') updateSelectionCursor(scene)
        else setSelectionCursor('default')
        return
      }

      if (it.kind === 'panning') {
        const dx = (e.clientX - it.startClient[0]) / s.camera.zoom
        const dy = (e.clientY - it.startClient[1]) / s.camera.zoom
        s.setCamera({
          scrollX: it.startScroll[0] + dx,
          scrollY: it.startScroll[1] + dy,
        })
        return
      }

      if (it.kind === 'erasing') {
        eraseAt(scene)
        return
      }

      if (it.kind === 'creating') {
        const el = s.elements.find((x) => x.id === it.id)
        if (!el) return
        if (el.type === 'line' || el.type === 'arrow') {
          if (el.type === 'arrow') {
            const tol = HIT_PX / s.camera.zoom
            const sourceTarget = el.startBinding
              ? s.elements.find((candidate) => candidate.id === el.startBinding!.elementId)
              : undefined
            const startBinding = sourceTarget
              ? bindingForPoint(sourceTarget, scene)
              : undefined
            const start = sourceTarget && startBinding
              ? pointForBinding(sourceTarget, startBinding)
              : it.start
            const target = bindableTargetAt(
              s.elements.filter((candidate) => !candidate.isDeleted),
              scene,
              tol,
              new Set([el.id, ...(sourceTarget ? [sourceTarget.id] : [])]),
            )
            const endBinding = target ? bindingForPoint(target, start) : undefined
            const end = target && endBinding
              ? pointForBinding(target, endBinding)
              : scene
            patch(
              (x) =>
                x.type === 'arrow'
                  ? setArrowEndpoints(
                      { ...x, startBinding, endBinding },
                      start,
                      end,
                    )
                  : x,
              (x) => x.id === it.id,
            )
          } else {
            patch(
              (x) => ({
                ...x,
                points: [
                  [0, 0],
                  [scene[0] - it.start[0], scene[1] - it.start[1]],
                ] as Point[],
              }),
              (x) => x.id === it.id,
            )
          }
        } else {
          const x = Math.min(it.start[0], scene[0])
          const y = Math.min(it.start[1], scene[1])
          patch(
            (el2) => ({
              ...el2,
              x,
              y,
              width: Math.abs(scene[0] - it.start[0]),
              height: Math.abs(scene[1] - it.start[1]),
            }),
            (el2) => el2.id === it.id,
          )
        }
        return
      }

      if (it.kind === 'freedrawing') {
        patch(
          (el) => {
            if (el.type !== 'freedraw') return el
            return {
              ...el,
              points: [
                ...el.points,
                [scene[0] - it.origin[0], scene[1] - it.origin[1]],
              ] as Point[],
              pressures: [...(el.pressures ?? []), e.pressure || 0.5],
            }
          },
          (el) => el.id === it.id,
        )
        return
      }

      if (it.kind === 'binding-arrow-endpoint') {
        const arrow = s.elements.find((el) => el.id === it.id)
        if (!arrow || arrow.type !== 'arrow') return
        const original = it.orig.type === 'arrow' ? it.orig : arrow
        const [origStart, origEnd] = arrowWorldPoints(original)
        const fixed = it.endpoint === 'start' ? origEnd : origStart
        const target = bindableTargetAt(
          s.elements.filter((el) => !el.isDeleted),
          scene,
          HIT_PX / s.camera.zoom,
          new Set([arrow.id]),
        )
        const binding = target ? bindingForPoint(target, fixed) : undefined
        const moved = target && binding ? pointForBinding(target, binding) : scene
        const start = it.endpoint === 'start' ? moved : fixed
        const end = it.endpoint === 'end' ? moved : fixed
        patch(
          (el) =>
            el.type === 'arrow'
              ? setArrowEndpoints(
                  {
                    ...el,
                    startBinding:
                      it.endpoint === 'start' ? binding : original.startBinding,
                    endBinding:
                      it.endpoint === 'end' ? binding : original.endBinding,
                  },
                  start,
                  end,
                )
              : el,
          (el) => el.id === it.id,
        )
        return
      }

      if (it.kind === 'translating') {
        const dx = scene[0] - it.start[0]
        const dy = scene[1] - it.start[1]
        s.setElements(
          refreshBoundArrows(
            s.elements.map((el) => {
              const o = it.orig.get(el.id)
              return o ? { ...el, x: o[0] + dx, y: o[1] + dy } : el
            }),
          ),
        )
        return
      }

      if (it.kind === 'marquee') {
        setMarquee({ x1: it.start[0], y1: it.start[1], x2: scene[0], y2: scene[1] })
        return
      }

      if (it.kind === 'resizing') {
        const { anchor, handle, origBox } = it
        const axes = handleAxes(handle)
        let fx = axes.sx
          ? (scene[0] - anchor[0]) / (origBox.w || 1)
          : 1
        let fy = axes.sy
          ? (scene[1] - anchor[1]) / (origBox.h || 1)
          : 1
        // No flipping / collapse in v1.
        fx = Math.max(0.05, Math.abs(fx))
        fy = Math.max(0.05, Math.abs(fy))
        if (e.shiftKey && axes.sx && axes.sy) {
          const f = Math.max(fx, fy)
          fx = f
          fy = f
        }
        const origById = new Map(it.orig.map((el) => [el.id, el]))
        s.setElements(
          refreshBoundArrows(
            s.elements.map((el) => {
              const o = origById.get(el.id)
              return o ? scaleElement(o, anchor, fx, fy) : el
            }),
          ),
        )
        return
      }

      if (it.kind === 'rotating') {
        const ang = Math.atan2(scene[1] - it.center[1], scene[0] - it.center[0])
        let delta = ang - it.startAngle
        if (e.shiftKey) {
          const step = Math.PI / 12 // 15° snap
          delta = Math.round(delta / step) * step
        }
        const origById = new Map(it.orig.map((el) => [el.id, el]))
        s.setElements(
          refreshBoundArrows(
            s.elements.map((el) => {
              const o = origById.get(el.id)
              if (!o) return el
              const ec: Point = [o.x + o.width / 2, o.y + o.height / 2]
              const [ncx, ncy] = rotateAround(ec, it.center, delta)
              return {
                ...el,
                x: ncx - o.width / 2,
                y: ncy - o.height / 2,
                angle: o.angle + delta,
              }
            }),
          ),
        )
        return
      }
    },
    [toScene, patch, eraseAt, updateSelectionCursor],
  )

  // ---- Pointer up ----
  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      const it = interaction.current
      const s = useEngine.getState()
      if (pointerId.current !== null) {
        svgRef.current?.releasePointerCapture(pointerId.current)
        pointerId.current = null
      }

      if (it.kind === 'creating') {
        const el = s.elements.find((x) => x.id === it.id)
        if (el) {
          const isLinear = el.type === 'line' || el.type === 'arrow'
          // Linear size lives in `points`, not width/height — measure normalized.
          const normalized = normalizeElement(el)
          const tiny = normalized.width < 4 && normalized.height < 4
          if (isLinear && tiny) {
            // Degenerate drag → drop the element.
            s.setElements(s.elements.filter((x) => x.id !== it.id))
          } else if (!isLinear && tiny) {
            // Click without drag → default size.
            patch(
              (x) => ({ ...x, width: 120, height: 80 }),
              (x) => x.id === it.id,
            )
          } else {
            patch((x) => normalizeElement(x), (x) => x.id === it.id)
          }
          // Tool stays active so you can draw several shapes in a row.
        }
      } else if (it.kind === 'freedrawing' && it.id !== '') {
        patch((x) => normalizeElement(x), (x) => x.id === it.id)
      } else if (it.kind === 'marquee') {
        const box = { x1: it.start[0], y1: it.start[1], x2: toScene(e)[0], y2: toScene(e)[1] }
        const hits = marqueeHits(s.elements.filter((el) => !el.isDeleted), box)
        s.setSelected(idSet(hits.map((h) => h.id)))
        setMarquee(null)
      }

      interaction.current = { kind: 'none' }
    },
    [toScene, patch],
  )

  const onDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      const s = useEngine.getState()
      const scene = toScene(e)
      const tol = HIT_PX / s.camera.zoom
      const hit = elementsAtPoint(
        s.elements.filter((el) => !el.isDeleted),
        scene,
        tol,
      )[0]
      if (!hit) return
      if (hit.type === 'text') {
        s.pushHistory()
        s.setEditingText(hit.id)
        return
      }
      // Double-click a shape → edit its bound label (create one if missing).
      const existing = s.elements.find(
        (el) => el.type === 'text' && el.containerId === hit.id && !el.isDeleted,
      )
      s.pushHistory()
      if (existing) {
        s.setEditingText(existing.id)
      } else {
        const label = createText([0, 0], s.defaults)
        const centered = {
          ...label,
          type: 'text' as const,
          textAlign: 'center' as const,
          verticalAlign: 'middle' as const,
          containerId: hit.id,
          x: hit.x + hit.width / 2,
          y: hit.y + hit.height / 2,
          width: 0,
          height: 0,
        }
        s.setElements([...s.elements, centered])
        s.setEditingText(centered.id)
      }
    },
    [toScene],
  )

  // ---- Keyboard ----
  React.useEffect(() => {
    const isTyping = () => {
      const a = document.activeElement
      return (
        a instanceof HTMLInputElement ||
        a instanceof HTMLTextAreaElement ||
        (a instanceof HTMLElement && a.isContentEditable)
      )
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isTyping()) spaceDown.current = true
      if (isTyping()) return
      if (useEngine.getState().editingTextId) return

      const s = useEngine.getState()
      const meta = e.ctrlKey || e.metaKey
      if (meta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (meta && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        s.redo()
        return
      }
      if (meta && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault()
        if (e.shiftKey) s.ungroupSelected()
        else s.groupSelected()
        return
      }
      if (meta && e.code === 'BracketRight') {
        e.preventDefault()
        s.reorderSelected(e.shiftKey ? 'front' : 'forward')
        return
      }
      if (meta && e.code === 'BracketLeft') {
        e.preventDefault()
        s.reorderSelected(e.shiftKey ? 'back' : 'backward')
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = s.selectedIds
        if (Object.keys(sel).length) {
          e.preventDefault()
          s.commitElements(
            s.elements.map((el) => (sel[el.id] ? { ...el, isDeleted: true } : el)),
          )
          s.setSelected({})
        }
        return
      }
      if (e.key === 'Escape') {
        s.setSelected({})
        return
      }
      if (meta) return
      const map: Record<string, Parameters<typeof s.setTool>[0]> = {
        v: 'select',
        h: 'hand',
        p: 'freedraw',
        r: 'rectangle',
        o: 'ellipse',
        d: 'diamond',
        l: 'line',
        a: 'arrow',
        t: 'text',
        e: 'eraser',
      }
      const tool = map[e.key.toLowerCase()]
      if (tool) s.setTool(tool)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceDown.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const transform = `scale(${camera.zoom}) translate(${camera.scrollX} ${camera.scrollY})`
  const cursor =
    activeTool === 'hand' || spaceDown.current
      ? 'grab'
      : activeTool === 'eraser'
        ? 'none'
        : activeTool === 'select'
          ? selectionCursor
          : 'crosshair'

  // Visible scene rect (for the dot grid).
  const vpW = viewport.width || 2000
  const vpH = viewport.height || 2000
  const [gx, gy] = viewportToScene(0, 0, camera)
  const gW = vpW / camera.zoom
  const gH = vpH / camera.zoom
  const gridId = 'duck-dot-grid'

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: canvasBackground(theme) }}>
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        style={{ cursor, display: 'block' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          setEraserCursor(null)
          setSelectionCursor('default')
        }}
        onDoubleClick={onDoubleClick}
      >
        <defs>
          <pattern id={gridId} width={28} height={28} patternUnits="userSpaceOnUse">
            <circle cx={1.4} cy={1.4} r={1.4} fill={gridColor(theme)} />
          </pattern>
        </defs>

        <g transform={transform}>
          <rect x={gx} y={gy} width={gW} height={gH} fill={`url(#${gridId})`} />

          <g>
            {live.map((el) => (
              <ElementNode
                key={el.id}
                element={el}
                theme={theme}
                hidden={el.id === editingTextId}
              />
            ))}
          </g>

          <SelectionOverlay
            elements={live}
            selectedIds={selectedIds}
            zoom={camera.zoom}
          />

          {marquee && (
            <rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill="var(--pond)"
              fillOpacity={0.08}
              stroke="var(--pond)"
              strokeWidth={1 / camera.zoom}
            />
          )}

          {activeTool === 'eraser' && eraserCursor && (
            <circle
              cx={eraserCursor[0]}
              cy={eraserCursor[1]}
              r={eraserSize / camera.zoom}
              fill="var(--foreground)"
              fillOpacity={0.06}
              stroke="var(--foreground)"
              strokeWidth={1.5 / camera.zoom}
              strokeDasharray={`${3 / camera.zoom} ${3 / camera.zoom}`}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>

      <TextEditor />
      <SelectionActions />
    </div>
  )
}
