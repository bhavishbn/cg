export class MapPreview {
  constructor(canvas, roadData) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.roadData = roadData;
    const points = roadData.roads.flatMap(road => road.points);
    const [west, south, east, north] = roadData.bbox;
    this.bounds = points.length ? [
      Math.min(west, ...points.map(point => point.lon)),
      Math.min(south, ...points.map(point => point.lat)),
      Math.max(east, ...points.map(point => point.lon)),
      Math.max(north, ...points.map(point => point.lat)),
    ] : roadData.bbox;
    this.mapImage = new Image();
    this.mapImage.onload = () => this.draw();
    this.mapImage.src = '/data/chamonix-valley-imagery.jpg';
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas);
    this.car = null;
    this.draw();
  }

  update(position) { this.car = position; this.draw(); }

  draw() {
    const { canvas, context, roadData } = this;
    const width = canvas.clientWidth || 160;
    const height = canvas.clientHeight || 160;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (this.mapImage.complete && this.mapImage.naturalWidth) {
      context.drawImage(this.mapImage, 0, 0, width, height);
    } else {
      const sky = context.createLinearGradient(0, 0, width, height);
      sky.addColorStop(0, '#192d2a'); sky.addColorStop(1, '#101b1b');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);
    }
    const [west, south, east, north] = this.bounds;
    const pad = 8;
    const mapWidth = width - pad * 2;
    const mapHeight = height - pad * 2;
    const project = point => [pad + (point.lon - west) / (east - west) * mapWidth, pad + (north - point.lat) / (north - south) * mapHeight];

    const style = {
      service: ['rgba(126, 156, 139, .38)', 0.6], track: ['rgba(206, 193, 162, .68)', 0.75], pedestrian: ['rgba(126, 156, 139, .42)', 0.55],
      residential: ['#b6c7b9', 1], living_street: ['#b6c7b9', 1], unclassified: ['#e6ddc1', 1.1],
      tertiary: ['#f4edda', 1.45], secondary: ['#f8ce84', 1.9], primary: ['#ffb957', 2.2], trunk: ['#ffc06a', 2.35], motorway: ['#ff9d62', 2.5],
    };
    for (const type of ['service', 'track', 'pedestrian', 'residential', 'living_street', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
      const [color, lineWidth] = style[type];
      context.beginPath();
      for (const road of roadData.roads) {
        if (road.type !== type || road.points.length < 2) continue;
        const [firstX, firstY] = project(road.points[0]);
        context.moveTo(firstX, firstY);
        for (let i = 1; i < road.points.length; i++) {
          const [x, y] = project(road.points[i]);
          context.lineTo(x, y);
        }
      }
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.stroke();
    }

    const roadPoints = roadData.roads.flatMap(road => road.points);
    if (roadPoints.length) {
      let north = -Infinity, south = Infinity;
      for (const point of roadPoints) { north = Math.max(north, point.lat); south = Math.min(south, point.lat); }
      const labelY = pad + (north - (north * .7 + south * .3)) / (north - south || 1) * mapHeight;
      const labelX = pad + ((6.869 - west) / (east - west || 1)) * mapWidth;
      context.save();
      context.font = '700 8px "DM Mono", monospace';
      context.textAlign = 'center';
      context.fillStyle = 'rgba(216,235,222,.66)';
      context.fillText('CHAMONIX', labelX, labelY);
      context.font = '6px "DM Mono", monospace';
      context.fillStyle = 'rgba(193,213,201,.42)';
      context.fillText('LES PRAZ', labelX + 27, labelY - 23);
      const place = (text, lon, lat) => {
        const x = pad + (lon - west) / (east - west || 1) * mapWidth;
        const y = pad + (north - lat) / (north - south || 1) * mapHeight;
        context.fillText(text, x, y);
      };
      place('ARGENTIERE', 6.93, 45.98);
      place('LES HOUCHES', 6.80, 45.89);
      context.fillText('AIGUILLETTE DES POSSETTES', width * .73, height * .19);
      context.restore();
    }

    if (this.car) {
      const x = pad + (this.car.x / this.car.widthMeters + 0.5) * mapWidth;
      const y = pad + (this.car.z / this.car.depthMeters + 0.5) * mapHeight;
      context.beginPath();
      context.arc(x, y, 4.4, 0, Math.PI * 2);
      context.fillStyle = '#d9f36a';
      context.shadowColor = '#d9f36a';
      context.shadowBlur = 10;
      context.fill();
      context.shadowBlur = 0;
    }
  }
}

