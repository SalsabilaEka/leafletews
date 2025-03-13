import { Component } from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';

const onIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@1.0/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const offIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@1.0/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  map!: L.Map;
  osmLayer!: L.TileLayer;
  satelliteLayer!: L.TileLayer;
  positronLayer!: L.TileLayer;
  geoJsonLayer!: L.GeoJSON;
  markerLayers: { [key: string]: L.LayerGroup } = {};
  prefersDarkMode!: boolean;

  constructor(private http: HttpClient) {}

  ngOnInit() {}

  ionViewDidEnter() {
    this.map = L.map('mapId').setView([7.6574714, 110.395469], 10);

    this.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    });

    this.positronLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; Carto'
    });

    const baseMaps = {
      "OpenStreetMap": this.osmLayer,
      "Satellite": this.satelliteLayer,
      "CartoDB Positron": this.positronLayer
    };
    L.control.layers(baseMaps).addTo(this.map);

    // Deteksi mode gelap
    this.prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.loadGeoJSON();
    this.addAPILayerControls();
  }

  loadGeoJSON() {
    fetch('assets/data/adminkec.geojson')
      .then(response => response.json())
      .then(geojsonData => {
        L.geoJSON(geojsonData, {
          style: () => ({
            color: 'black',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.4,
            fillColor: 'lightblue'
          })
        }).addTo(this.map);
      })
      .catch(error => console.error('Error loading GeoJSON:', error));
  }

  loadMarkersFromAPI(apiUrl: string, layerName: string) {
    if (!this.markerLayers[layerName]) {
      this.markerLayers[layerName] = L.layerGroup().addTo(this.map);
    }

    this.http.get<any[]>(apiUrl).subscribe(
      (data) => {
        data.forEach(item => {
          const lat = parseFloat(item.Lintang);
          const lng = parseFloat(item.Bujur);

          if (!isNaN(lat) && !isNaN(lng)) {
            let icon = offIcon; // Default ke offIcon

            if (item.Kondisi === 'Hidup') {
                icon = onIcon;
            }

            const marker = L.marker([lat, lng], { icon });
            const popupContent = this.getPopupContent(layerName, item);
            marker.bindPopup(popupContent);
            marker.addTo(this.markerLayers[layerName]);
        }
        });
      },
      (error) => {
        console.error(`Error loading markers from API (${apiUrl}):`, error);
      }
    );
  }

  formatDate(dateString: string): string {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', options);
  }

  getPopupContent(layerName: string, item: any): string {
    switch (layerName) {
      case 'EWS':
        return `
          <strong>Nama EWS: </strong> ${item['Nama']}<br>
          <strong>Status: </strong>${item['Kondisi']}<br>
        `;
      case 'CCTV':
        return `
          <strong>Nama CCTV: </strong> ${item['Nama']}<br>
          <strong>Status: </strong>${item['Kondisi']}<br>
        `;
      default:
        return '<strong>Data tidak tersedia</strong>';
    }
  }

  addAPILayerControls() {
    const apiData = [
      { url: 'https://script.google.com/macros/s/AKfycbwyc185bvi-aM5x8fXkHkun7B_v6uAMUUw0-KZdCzprpmH8jF5Zwd3sQuMG-UUG0BUexQ/exec', name: 'EWS' },
      { url: 'https://script.google.com/macros/s/AKfycbwwcjhjSyuEW_6ng4lgAcW3qwxQ2eQWKQUwsCdgXWdhSTdgQgmbfOoQGWlRmsUfDVN8JQ/exec', name: 'CCTV' },

    ];

    const CustomControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: () => {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        div.innerHTML = `
          <div style="background-color: white; color: black; padding: 10px; border-radius: 5px;">
            <strong>Informasi Titik</strong><br>
            <small>Pilih layer titik untuk ditampilkan:</small><br>
            ${apiData.map(api => `
              <label style="cursor: pointer; display: block; margin: 5px 0;">
                <input type="checkbox" id="${api.name}" style="margin-right: 5px;" />
                ${api.name}
              </label>`).join('')}
          </div>
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      }
    });


    this.map.addControl(new CustomControl());

    apiData.forEach((api) => {
      setTimeout(() => {
        const checkboxElement = document.getElementById(api.name) as HTMLInputElement;
        checkboxElement?.addEventListener('change', () => {
          if (checkboxElement.checked) {
            this.loadMarkersFromAPI(api.url, api.name);
          } else if (this.markerLayers[api.name]) {
            this.map.removeLayer(this.markerLayers[api.name]);
          }
        });
      }, 500);
    });
  }
}
