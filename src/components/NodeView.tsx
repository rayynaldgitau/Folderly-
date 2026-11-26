import React, { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DirContents, FileEntry, FolderEntry } from "../types";
import { IconPlus, IconRefresh } from "./ui";

export type NodeCategory = "folder" | "image" | "doc" | "code" | "other" | "cluster";

export interface NodeViewProps {
  /** Current folder path (or "recents" / null). */
  currentPath: string | null;
  /** Subfolders in the current directory. */
  folders: FolderEntry[];
  /** Files in the current directory. */
  files: FileEntry[];
  /** Currently selected paths in Foldy. */
  selectedPaths: Set<string>;
  /** Select a single item (updates Details/Preview panes). */
  onSelectSingle: (path: string) => void;
  /** Navigate into a folder. */
  onNavigateFolder: (path: string) => void;
  /** Open a file in OS. */
  onOpenFile: (path: string) => void;
  /** Preview a file (e.g. QuickPreviewModal). */
  onPreviewFile?: (path: string) => void;
  /** Right-click context menu handler. */
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
}

interface GraphNode {
  id: string;
  label: string;
  path: string;
  category: NodeCategory;
  isRoot?: boolean;
  isFolder: boolean;
  size?: number;
  extension?: string;
  parentId: string | null;
  expanded?: boolean;
  loading?: boolean;
  clusterCount?: number;
  clusterRemaining?: { folders: FolderEntry[]; files: FileEntry[] };
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface ThemePalette {
  surface: string;
  surfaceContainerHigh: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  success: string;
  successContainer: string;
  surfaceContainerHighest: string;
  fontFamily: string;
}

const MAX_CHILDREN_PER_FOLDER = 48;
const MAX_TOTAL_NODES = 160;

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"]);
const DOC_EXTS = new Set(["pdf", "doc", "docx", "txt", "md", "rtf", "csv", "xls", "xlsx", "ppt", "pptx"]);
const CODE_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "c", "cpp", "h", "cs",
  "html", "css", "scss", "json", "yaml", "yml", "toml", "xml", "sh", "bat", "ps1", "sql",
]);

function classifyFile(extension?: string): NodeCategory {
  const ext = (extension || "").toLowerCase().replace(/^\./, "");
  if (IMAGE_EXTS.has(ext)) return "image";
  if (DOC_EXTS.has(ext)) return "doc";
  if (CODE_EXTS.has(ext)) return "code";
  return "other";
}

function getFolderDisplayName(path: string | null): string {
  if (!path) return "Workspace";
  if (path === "recents") return "Recent Files";
  const cleaned = path.replace(/[\\/]+$/, "");
  const parts = cleaned.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || path;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function readThemePalette(): ThemePalette {
  const styles = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    surface: get("--md-sys-color-surface", "#111318"),
    surfaceContainerHigh: get("--md-sys-color-surface-container-high", "#282a2f"),
    surfaceContainerHighest: get("--md-sys-color-surface-container-highest", "#33353a"),
    onSurface: get("--md-sys-color-on-surface", "#e2e2e9"),
    onSurfaceVariant: get("--md-sys-color-on-surface-variant", "#c4c6cf"),
    outline: get("--md-sys-color-outline", "#8e9099"),
    outlineVariant: get("--md-sys-color-outline-variant", "#43474e"),
    primary: get("--md-sys-color-primary", "#a4c9ff"),
    primaryContainer: get("--md-sys-color-primary-container", "#094378"),
    onPrimaryContainer: get("--md-sys-color-on-primary-container", "#d4e3ff"),
    secondary: get("--md-sys-color-secondary", "#bcc7dc"),
    secondaryContainer: get("--md-sys-color-secondary-container", "#3c4758"),
    tertiary: get("--md-sys-color-tertiary", "#d7bee4"),
    tertiaryContainer: get("--md-sys-color-tertiary-container", "#523f5f"),
    success: get("--md-sys-color-success", "#7dd89b"),
    successContainer: get("--md-sys-color-success-container", "#0f5228"),
    fontFamily: get("--md-sys-typescale-font-family", "Inter, system-ui, sans-serif"),
  };
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sides: number,
  rotation = 0
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * Math.PI * 2) / sides;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Interactive Obsidian-style Canvas graph view for exploring folders and files.
 * Uses M3 semantic tokens, zero external graph dependencies, and caps large folders.
 */
export const NodeView: React.FC<NodeViewProps> = ({
  currentPath,
  folders,
  files,
  selectedPaths,
  onSelectSingle,
  onNavigateFolder,
  onOpenFile,
  onPreviewFile,
  onContextMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());
  const paletteRef = useRef<ThemePalette>(readThemePalette());

  // Camera & interaction refs (no React state per frame)
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const alphaRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const dragRef = useRef<{
    type: "node" | "pan" | null;
    nodeId: string | null;
    startX: number;
    startY: number;
    camStartX: number;
    camStartY: number;
    moved: boolean;
    lastWorldX: number;
    lastWorldY: number;
  }>({
    type: null,
    nodeId: null,
    startX: 0,
    startY: 0,
    camStartX: 0,
    camStartY: 0,
    moved: false,
    lastWorldX: 0,
    lastWorldY: 0,
  });

  const selectedPathsRef = useRef(selectedPaths);
  selectedPathsRef.current = selectedPaths;

  const [graphStats, setGraphStats] = useState({ nodes: 0, clustered: 0 });
  const [zoomPercent, setZoomPercent] = useState(100);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: GraphNode;
  } | null>(null);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    const tick = () => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap = nodeMapRef.current;
      const palette = paletteRef.current;
      const cam = cameraRef.current;

      // Step force simulation if still warm
      let alpha = alphaRef.current;
      if (alpha > 0.002 && nodes.length > 0) {
        const repulsion = 2600;
        const springLen = 105;
        const springK = 0.06;
        const centerPull = 0.012;
        const damping = 0.82;
        const draggedId = dragRef.current.type === "node" ? dragRef.current.nodeId : null;

        // Pairwise repulsion (N <= 160 -> fast)
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distSq = dx * dx + dy * dy;
            if (distSq < 1) {
              dx = (Math.random() - 0.5) * 2;
              dy = (Math.random() - 0.5) * 2;
              distSq = dx * dx + dy * dy + 0.1;
            }
            const dist = Math.sqrt(distSq);
            const minDist = a.radius + b.radius + 18;
            const force = (repulsion / distSq) * alpha + (dist < minDist ? (minDist - dist) * 0.25 : 0);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (a.id !== draggedId && !a.isRoot) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (b.id !== draggedId && !b.isRoot) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }

        // Edge springs
        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          const s = nodeMap.get(e.source);
          const t = nodeMap.get(e.target);
          if (!s || !t) continue;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetLen = s.isRoot ? springLen + 20 : springLen;
          const force = (dist - targetLen) * springK * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (s.id !== draggedId && !s.isRoot) {
            s.vx += fx;
            s.vy += fy;
          }
          if (t.id !== draggedId && !t.isRoot) {
            t.vx -= fx;
            t.vy -= fy;
          }
        }

        // Gentle center gravity + integrate
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.id === draggedId || n.isRoot) {
            n.vx = 0;
            n.vy = 0;
            continue;
          }
          n.vx += -n.x * centerPull * alpha;
          n.vy += -n.y * centerPull * alpha;
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }

        alpha *= 0.965;
        alphaRef.current = alpha;
      }

      // Render frame
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Subtle background dot grid
      const gridStep = 28 * cam.scale;
      if (gridStep >= 10) {
        const offsetX = ((width / 2 + cam.x) % gridStep + gridStep) % gridStep;
        const offsetY = ((height / 2 + cam.y) % gridStep + gridStep) % gridStep;
        ctx.fillStyle = palette.outlineVariant;
        ctx.globalAlpha = 0.28;
        for (let gx = offsetX; gx < width; gx += gridStep) {
          for (let gy = offsetY; gy < height; gy += gridStep) {
            ctx.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
          }
        }
        ctx.globalAlpha = 1;
      }

      ctx.translate(width / 2 + cam.x, height / 2 + cam.y);
      ctx.scale(cam.scale, cam.scale);

      const hoveredId = hoveredIdRef.current;
      const connectedToHover = new Set<string>();
      if (hoveredId) {
        connectedToHover.add(hoveredId);
        for (const e of edges) {
          if (e.source === hoveredId) connectedToHover.add(e.target);
          else if (e.target === hoveredId) connectedToHover.add(e.source);
        }
      }

      // Draw edges
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const isHighlighted =
          hoveredId !== null && (e.source === hoveredId || e.target === hoveredId);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHighlighted ? palette.primary : palette.outlineVariant;
        ctx.lineWidth = isHighlighted ? 2 / cam.scale : 1.15 / cam.scale;
        ctx.globalAlpha = hoveredId
          ? isHighlighted
            ? 0.95
            : 0.2
          : 0.65;
        ctx.stroke();
      }

      // Draw nodes
      const selectedSet = selectedPathsRef.current;
      ctx.font = `500 11px ${palette.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const isHovered = n.id === hoveredId;
        const isSelected = selectedSet.has(n.path);
        const isDimmed = hoveredId !== null && !connectedToHover.has(n.id);

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.3 : 1;

        let fill = palette.surfaceContainerHighest;
        let stroke = palette.outline;
        switch (n.category) {
          case "folder":
            fill = palette.primaryContainer;
            stroke = palette.primary;
            break;
          case "image":
            fill = palette.tertiaryContainer;
            stroke = palette.tertiary;
            break;
          case "doc":
            fill = palette.secondaryContainer;
            stroke = palette.secondary;
            break;
          case "code":
            fill = palette.successContainer;
            stroke = palette.success;
            break;
          case "cluster":
            fill = palette.surfaceContainerHigh;
            stroke = palette.outline;
            break;
          default:
            fill = palette.surfaceContainerHighest;
            stroke = palette.outline;
        }

        const r = isHovered ? n.radius * 1.12 : n.radius;

        // Selection / hover halo
        if (isSelected || isHovered || n.isRoot) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = palette.primary;
          ctx.lineWidth = isSelected ? 2.2 : 1.4;
          ctx.globalAlpha = isDimmed ? 0.2 : 0.7;
          ctx.stroke();
          ctx.globalAlpha = isDimmed ? 0.3 : 1;
        }

        // Shape by category
        if (n.category === "folder") {
          drawPolygon(ctx, n.x, n.y, r, 6, Math.PI / 6);
        } else if (n.category === "image") {
          drawPolygon(ctx, n.x, n.y, r * 1.05, 4, 0);
        } else if (n.category === "doc") {
          drawRoundedRect(ctx, n.x - r, n.y - r * 0.85, r * 2, r * 1.7, 5);
        } else if (n.category === "code") {
          drawPolygon(ctx, n.x, n.y, r, 8, Math.PI / 8);
        } else {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        }

        ctx.fillStyle = fill;
        ctx.fill();
        if (n.category === "cluster") {
          ctx.setLineDash([3, 3]);
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = n.isRoot ? 2.2 : 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Cluster count inside node
        if (n.category === "cluster" && n.clusterCount) {
          ctx.fillStyle = palette.onSurface;
          ctx.font = `600 10px ${palette.fontFamily}`;
          ctx.textBaseline = "middle";
          ctx.fillText(`+${n.clusterCount}`, n.x, n.y);
          ctx.textBaseline = "top";
          ctx.font = `500 11px ${palette.fontFamily}`;
        }

        // Node label
        const showLabel =
          n.isRoot ||
          n.expanded ||
          isHovered ||
          isSelected ||
          n.category === "cluster" ||
          cam.scale >= 0.85;

        if (showLabel) {
          const maxChars = n.isRoot ? 26 : 18;
          const text =
            n.label.length > maxChars ? `${n.label.slice(0, maxChars - 1)}…` : n.label;
          ctx.fillStyle = n.isRoot ? palette.primary : palette.onSurface;
          ctx.font = n.isRoot
            ? `600 12px ${palette.fontFamily}`
            : `500 11px ${palette.fontFamily}`;
          ctx.fillText(text, n.x, n.y + r + 5);
        }

        ctx.restore();
      }

      ctx.restore();

      if (alphaRef.current > 0.002) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Build initial graph when folder contents change
  useEffect(() => {
    const rootId = currentPath || "__root__";
    const rootNode: GraphNode = {
      id: rootId,
      label: getFolderDisplayName(currentPath),
      path: currentPath || "",
      category: "folder",
      isRoot: true,
      isFolder: true,
      parentId: null,
      expanded: true,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 22,
    };

    const nextNodes: GraphNode[] = [rootNode];
    const nextEdges: GraphEdge[] = [];
    const map = new Map<string, GraphNode>([[rootId, rootNode]]);

    const combined: Array<{ isFolder: boolean; entry: FolderEntry | FileEntry }> = [
      ...folders.map((entry) => ({ isFolder: true, entry })),
      ...files.map((entry) => ({ isFolder: false, entry })),
    ];

    const visibleLimit = Math.min(MAX_CHILDREN_PER_FOLDER, MAX_TOTAL_NODES - 1);
    const visible = combined.slice(0, visibleLimit);
    const overflow = combined.slice(visibleLimit);

    const totalRing = visible.length + (overflow.length > 0 ? 1 : 0);
    visible.forEach((item, idx) => {
      const angle = (idx / Math.max(1, totalRing)) * Math.PI * 2;
      const dist = 110 + (idx % 3) * 26;
      const isFolder = item.isFolder;
      const ext = isFolder ? undefined : (item.entry as FileEntry).extension;
      const node: GraphNode = {
        id: item.entry.path,
        label: item.entry.name,
        path: item.entry.path,
        category: isFolder ? "folder" : classifyFile(ext),
        isFolder,
        size: isFolder ? undefined : (item.entry as FileEntry).size,
        extension: ext,
        parentId: rootId,
        expanded: false,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: isFolder ? 14 : 10,
      };
      nextNodes.push(node);
      map.set(node.id, node);
      nextEdges.push({ source: rootId, target: node.id });
    });

    if (overflow.length > 0) {
      const angle = ((totalRing - 1) / Math.max(1, totalRing)) * Math.PI * 2;
      const clusterId = `${rootId}::__cluster__`;
      const clusterNode: GraphNode = {
        id: clusterId,
        label: `${overflow.length} more`,
        path: clusterId,
        category: "cluster",
        isFolder: false,
        parentId: rootId,
        clusterCount: overflow.length,
        clusterRemaining: {
          folders: overflow.filter((o) => o.isFolder).map((o) => o.entry as FolderEntry),
          files: overflow.filter((o) => !o.isFolder).map((o) => o.entry as FileEntry),
        },
        x: Math.cos(angle) * 130,
        y: Math.sin(angle) * 130,
        vx: 0,
        vy: 0,
        radius: 15,
      };
      nextNodes.push(clusterNode);
      map.set(clusterId, clusterNode);
      nextEdges.push({ source: rootId, target: clusterId });
    }

    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    nodeMapRef.current = map;
    cameraRef.current = { x: 0, y: 0, scale: 1 };
    setZoomPercent(100);
    setGraphStats({ nodes: nextNodes.length, clustered: overflow.length });
    setTooltip(null);
    alphaRef.current = 1;
    scheduleDraw();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [currentPath, folders, files, scheduleDraw]);

  // Keep canvas sized to container & observe theme changes
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      scheduleDraw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const mo = new MutationObserver(() => {
      paletteRef.current = readThemePalette();
      scheduleDraw();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [scheduleDraw]);

  // Redraw when selection changes
  useEffect(() => {
    scheduleDraw();
  }, [selectedPaths, scheduleDraw]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const cam = cameraRef.current;
    return {
      x: (sx - rect.width / 2 - cam.x) / cam.scale,
      y: (sy - rect.height / 2 - cam.y) / cam.scale,
    };
  };

  const hitTest = (wx: number, wy: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      const hitR = n.radius + 5;
      if (dx * dx + dy * dy <= hitR * hitR) {
        return n;
      }
    }
    return null;
  };

  const collapseFolderNode = useCallback((folderNode: GraphNode) => {
    const toRemove = new Set<string>();
    const collectDescendants = (parentId: string) => {
      for (const n of nodesRef.current) {
        if (n.parentId === parentId) {
          toRemove.add(n.id);
          collectDescendants(n.id);
        }
      }
    };
    collectDescendants(folderNode.id);
    if (toRemove.size === 0) {
      folderNode.expanded = false;
      return;
    }

    nodesRef.current = nodesRef.current.filter((n) => !toRemove.has(n.id));
    edgesRef.current = edgesRef.current.filter(
      (e) => !toRemove.has(e.source) && !toRemove.has(e.target)
    );
    for (const id of toRemove) {
      nodeMapRef.current.delete(id);
    }
    folderNode.expanded = false;
    setGraphStats((prev) => ({ ...prev, nodes: nodesRef.current.length }));
    alphaRef.current = Math.max(alphaRef.current, 0.45);
    scheduleDraw();
  }, [scheduleDraw]);

  const expandFolderNode = useCallback(async (folderNode: GraphNode) => {
    if (folderNode.isRoot || folderNode.loading) return;
    if (folderNode.expanded) {
      collapseFolderNode(folderNode);
      return;
    }
    if (nodesRef.current.length >= MAX_TOTAL_NODES) {
      onNavigateFolder(folderNode.path);
      return;
    }

    folderNode.loading = true;
    try {
      const contents = await invoke<DirContents>("read_folder_contents", {
        dirPath: folderNode.path,
      });
      const availableBudget = Math.max(0, MAX_TOTAL_NODES - nodesRef.current.length);
      const limit = Math.min(MAX_CHILDREN_PER_FOLDER, availableBudget);
      const combined: Array<{ isFolder: boolean; entry: FolderEntry | FileEntry }> = [
        ...contents.folders.map((entry) => ({ isFolder: true, entry })),
        ...contents.files.map((entry) => ({ isFolder: false, entry })),
      ];

      const slice = combined.slice(0, limit);
      const overflowCount = combined.length - slice.length;
      const totalNew = slice.length + (overflowCount > 0 ? 1 : 0);

      slice.forEach((item, idx) => {
        if (nodeMapRef.current.has(item.entry.path)) return;
        const angle = (idx / Math.max(1, totalNew)) * Math.PI * 2;
        const dist = 82;
        const isFolder = item.isFolder;
        const ext = isFolder ? undefined : (item.entry as FileEntry).extension;
        const child: GraphNode = {
          id: item.entry.path,
          label: item.entry.name,
          path: item.entry.path,
          category: isFolder ? "folder" : classifyFile(ext),
          isFolder,
          size: isFolder ? undefined : (item.entry as FileEntry).size,
          extension: ext,
          parentId: folderNode.id,
          expanded: false,
          x: folderNode.x + Math.cos(angle) * dist,
          y: folderNode.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          radius: isFolder ? 13 : 9.5,
        };
        nodesRef.current.push(child);
        nodeMapRef.current.set(child.id, child);
        edgesRef.current.push({ source: folderNode.id, target: child.id });
      });

      if (overflowCount > 0) {
        const clusterId = `${folderNode.id}::__cluster__`;
        if (!nodeMapRef.current.has(clusterId)) {
          const clusterNode: GraphNode = {
            id: clusterId,
            label: `${overflowCount} more`,
            path: clusterId,
            category: "cluster",
            isFolder: false,
            parentId: folderNode.id,
            clusterCount: overflowCount,
            x: folderNode.x + 70,
            y: folderNode.y + 40,
            vx: 0,
            vy: 0,
            radius: 14,
          };
          nodesRef.current.push(clusterNode);
          nodeMapRef.current.set(clusterId, clusterNode);
          edgesRef.current.push({ source: folderNode.id, target: clusterId });
        }
      }

      folderNode.expanded = true;
      setGraphStats((prev) => ({
        nodes: nodesRef.current.length,
        clustered: prev.clustered + Math.max(0, overflowCount),
      }));
      alphaRef.current = 0.8;
      scheduleDraw();
    } catch {
      // Fallback to navigating into the folder if read fails
      onNavigateFolder(folderNode.path);
    } finally {
      folderNode.loading = false;
    }
  }, [collapseFolderNode, onNavigateFolder, scheduleDraw]);

  const expandClusterNode = useCallback((clusterNode: GraphNode) => {
    const remaining = clusterNode.clusterRemaining;
    if (!remaining || !clusterNode.parentId) return;
    const parent = nodeMapRef.current.get(clusterNode.parentId);
    if (!parent) return;

    // Remove cluster node
    nodesRef.current = nodesRef.current.filter((n) => n.id !== clusterNode.id);
    edgesRef.current = edgesRef.current.filter(
      (e) => e.target !== clusterNode.id && e.source !== clusterNode.id
    );
    nodeMapRef.current.delete(clusterNode.id);

    const combined: Array<{ isFolder: boolean; entry: FolderEntry | FileEntry }> = [
      ...remaining.folders.map((entry) => ({ isFolder: true, entry })),
      ...remaining.files.map((entry) => ({ isFolder: false, entry })),
    ];
    const batchSize = Math.min(32, Math.max(0, MAX_TOTAL_NODES - nodesRef.current.length));
    const slice = combined.slice(0, batchSize);
    const rest = combined.slice(batchSize);

    slice.forEach((item, idx) => {
      if (nodeMapRef.current.has(item.entry.path)) return;
      const angle = (idx / Math.max(1, slice.length)) * Math.PI * 2;
      const isFolder = item.isFolder;
      const ext = isFolder ? undefined : (item.entry as FileEntry).extension;
      const node: GraphNode = {
        id: item.entry.path,
        label: item.entry.name,
        path: item.entry.path,
        category: isFolder ? "folder" : classifyFile(ext),
        isFolder,
        size: isFolder ? undefined : (item.entry as FileEntry).size,
        extension: ext,
        parentId: parent.id,
        x: clusterNode.x + Math.cos(angle) * 45,
        y: clusterNode.y + Math.sin(angle) * 45,
        vx: 0,
        vy: 0,
        radius: isFolder ? 14 : 10,
      };
      nodesRef.current.push(node);
      nodeMapRef.current.set(node.id, node);
      edgesRef.current.push({ source: parent.id, target: node.id });
    });

    if (rest.length > 0) {
      const nextCluster: GraphNode = {
        ...clusterNode,
        label: `${rest.length} more`,
        clusterCount: rest.length,
        clusterRemaining: {
          folders: rest.filter((o) => o.isFolder).map((o) => o.entry as FolderEntry),
          files: rest.filter((o) => !o.isFolder).map((o) => o.entry as FileEntry),
        },
      };
      nodesRef.current.push(nextCluster);
      nodeMapRef.current.set(nextCluster.id, nextCluster);
      edgesRef.current.push({ source: parent.id, target: nextCluster.id });
    }

    setGraphStats({ nodes: nodesRef.current.length, clustered: rest.length });
    alphaRef.current = 0.75;
    scheduleDraw();
  }, [scheduleDraw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);

    e.currentTarget.setPointerCapture(e.pointerId);
    if (hit) {
      dragRef.current = {
        type: "node",
        nodeId: hit.id,
        startX: e.clientX,
        startY: e.clientY,
        camStartX: cameraRef.current.x,
        camStartY: cameraRef.current.y,
        moved: false,
        lastWorldX: world.x,
        lastWorldY: world.y,
      };
    } else {
      dragRef.current = {
        type: "pan",
        nodeId: null,
        startX: e.clientX,
        startY: e.clientY,
        camStartX: cameraRef.current.x,
        camStartY: cameraRef.current.y,
        moved: false,
        lastWorldX: world.x,
        lastWorldY: world.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const world = screenToWorld(e.clientX, e.clientY);

    if (drag.type === "node" && drag.nodeId) {
      const distMoved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (distMoved > 3) drag.moved = true;
      const node = nodeMapRef.current.get(drag.nodeId);
      if (node) {
        node.vx = (world.x - node.x) * 0.35;
        node.vy = (world.y - node.y) * 0.35;
        node.x = world.x;
        node.y = world.y;
        alphaRef.current = Math.max(alphaRef.current, 0.25);
        scheduleDraw();
      }
      setTooltip(null);
      return;
    }

    if (drag.type === "pan") {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      cameraRef.current.x = drag.camStartX + dx;
      cameraRef.current.y = drag.camStartY + dy;
      scheduleDraw();
      setTooltip(null);
      return;
    }

    // Hover detection
    const hit = hitTest(world.x, world.y);
    const nextHoverId = hit ? hit.id : null;
    if (hoveredIdRef.current !== nextHoverId) {
      hoveredIdRef.current = nextHoverId;
      scheduleDraw();
    }
    if (hit && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        node: hit,
      });
    } else if (tooltip !== null) {
      setTooltip(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag.moved && drag.type === "node" && drag.nodeId) {
      const node = nodeMapRef.current.get(drag.nodeId);
      if (node) {
        if (node.category === "cluster") {
          expandClusterNode(node);
        } else if (node.isFolder) {
          if (!node.isRoot) {
            onSelectSingle(node.path);
            void expandFolderNode(node);
          }
        } else {
          onSelectSingle(node.path);
          if (onPreviewFile) {
            onPreviewFile(node.path);
          } else {
            onOpenFile(node.path);
          }
        }
      }
    }
    dragRef.current.type = null;
    dragRef.current.nodeId = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);
    if (!hit || hit.category === "cluster") return;
    if (hit.isFolder && !hit.isRoot) {
      onNavigateFolder(hit.path);
    } else if (!hit.isFolder) {
      onOpenFile(hit.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);
    if (hit && !hit.isRoot && hit.category !== "cluster") {
      onContextMenu(e, hit.path, hit.isFolder);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const cam = cameraRef.current;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const nextScale = Math.min(3.5, Math.max(0.25, cam.scale * factor));
    const ratio = nextScale / cam.scale;

    cam.x = cx - (cx - cam.x) * ratio;
    cam.y = cy - (cy - cam.y) * ratio;
    cam.scale = nextScale;
    setZoomPercent(Math.round(nextScale * 100));
    scheduleDraw();
  };

  const adjustZoom = (factor: number) => {
    const cam = cameraRef.current;
    const nextScale = Math.min(3.5, Math.max(0.25, cam.scale * factor));
    cam.scale = nextScale;
    setZoomPercent(Math.round(nextScale * 100));
    scheduleDraw();
  };

  const resetView = () => {
    cameraRef.current = { x: 0, y: 0, scale: 1 };
    setZoomPercent(100);
    alphaRef.current = Math.max(alphaRef.current, 0.35);
    scheduleDraw();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-220px)] min-h-[420px] rounded-m3-lg bg-surface-container-lowest border border-outline-variant/40 overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          hoveredIdRef.current = null;
          setTooltip(null);
          scheduleDraw();
        }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
      />

      {/* Top-left status & experimental badge */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-m3-full bg-surface-container-high/90 backdrop-blur-sm border border-outline-variant/40 text-[11px] text-on-surface-variant shadow-m3-1">
        <span className="px-2 py-0.5 rounded-m3-full bg-tertiary-container text-on-tertiary-container font-semibold">
          Experimental
        </span>
        <span className="font-medium text-on-surface">{graphStats.nodes} nodes</span>
        {graphStats.clustered > 0 && (
          <span>({graphStats.clustered} clustered)</span>
        )}
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 px-3 py-2 rounded-m3-md bg-inverse-surface text-inverse-on-surface text-xs shadow-m3-2 max-w-[240px]"
          style={{
            left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth ?? 400) - 250),
            top: Math.max(12, tooltip.y - 12),
          }}
        >
          <div className="font-semibold truncate">{tooltip.node.label}</div>
          <div className="text-[11px] opacity-80 mt-0.5">
            {tooltip.node.category === "cluster"
              ? "Click to load more items"
              : tooltip.node.isRoot
              ? "Current folder"
              : tooltip.node.isFolder
              ? "Folder · Click to expand · Double-click to open"
              : `${tooltip.node.extension?.toUpperCase() || "File"}${
                  tooltip.node.size !== undefined ? ` · ${formatBytes(tooltip.node.size)}` : ""
                } · Click to preview`}
          </div>
        </div>
      )}

      {/* Bottom-left shape/color legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-m3-full bg-surface-container-high/90 backdrop-blur-sm border border-outline-variant/40 text-[11px] text-on-surface-variant shadow-m3-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-primary-container border border-primary" />
          Folder
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45 bg-tertiary-container border border-tertiary" />
          Image
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2 rounded-[2px] bg-secondary-container border border-secondary" />
          Doc
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success-container border border-success" />
          Code
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest border border-outline" />
          Other
        </span>
      </div>

      {/* Bottom-right zoom & reset controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-m3-full bg-surface-container-high/90 backdrop-blur-sm border border-outline-variant/40 shadow-m3-1">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => adjustZoom(0.82)}
          className="w-8 h-8 rounded-m3-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span className="px-1.5 text-[11px] font-medium text-on-surface-variant tabular-nums min-w-[40px] text-center">
          {zoomPercent}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => adjustZoom(1.22)}
          className="w-8 h-8 rounded-m3-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
        >
          <IconPlus size={14} />
        </button>
        <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />
        <button
          type="button"
          aria-label="Reset view"
          title="Reset camera"
          onClick={resetView}
          className="w-8 h-8 rounded-m3-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
        >
          <IconRefresh size={14} />
        </button>
      </div>
    </div>
  );
};

export default NodeView;
