import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Download, X, Clipboard, Image as ImageIcon, Plus, Info, ZoomIn, ZoomOut, Maximize2, Move, ChevronLeft, ChevronRight, Edit3, Check, Sparkles, Tag, Type, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { savePhoto, getAllPhotos, deletePhoto, updatePhoto } from './storage';
import './App.css';

function App() {
  const [photos, setPhotos] = useState([]);
  const [isNaming, setIsNaming] = useState(false);
  const [photoName, setPhotoName] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoGroup, setPhotoGroup] = useState('');

  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [showFlash, setShowFlash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Viewer State
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });

  // Filter State
  const [activeGroup, setActiveGroup] = useState('All');

  // Renaming/Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({ name: '', caption: '', group: '' });

  useEffect(() => {
    loadPhotos();
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          handleImageInput(blob);
          break;
        }
      }
    };

    const handleKeyDown = (e) => {
      if (selectedPhoto && !isEditing) {
        if (e.key === 'ArrowRight') navigateGallery(1);
        if (e.key === 'ArrowLeft') navigateGallery(-1);
        if (e.key === 'Escape') closeViewer();
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhoto, selectedIndex, isEditing, photos]);

  const loadPhotos = async () => {
    const data = await getAllPhotos();
    setPhotos(data.reverse());
  };

  const groups = useMemo(() => {
    const g = new Set(['All']);
    photos.forEach(p => {
      if (p.group) g.add(p.group);
    });
    return Array.from(g);
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    if (activeGroup === 'All') return photos;
    return photos.filter(p => p.group === activeGroup);
  }, [photos, activeGroup]);

  const handleImageInput = (blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedDataUrl(e.target.result);
      setCapturedBlob(blob);
      setIsNaming(true);
      setPhotoName('');
      setPhotoCaption('');
      setPhotoGroup('');
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);
    };
    reader.readAsDataURL(blob);
  };

  const handleSave = async () => {
    if (capturedBlob) {
      const finalName = photoName.trim() || `Snap ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      await savePhoto(capturedBlob, finalName, photoCaption.trim(), photoGroup.trim());
      setIsNaming(false);
      setCapturedBlob(null);
      setCapturedDataUrl(null);
      loadPhotos();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageInput(files[0]);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirm("Permanently delete this snapshot?")) {
      await deletePhoto(id);
      loadPhotos();
      if (selectedPhoto?.id === id) setSelectedPhoto(null);
    }
  };

  const handleDownload = (e, blob, name) => {
    e.stopPropagation();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            handleImageInput(blob);
            return;
          }
        }
      }
      alert("Clipboard Empty! Use Win+Shift+S first.");
    } catch (err) {
      console.error(err);
      alert("Please allow clipboard access or use Ctrl+V.");
    }
  };

  const openViewer = (photo, index) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsEditing(false);
  };

  const closeViewer = () => {
    setSelectedPhoto(null);
    setSelectedIndex(-1);
    setIsEditing(false);
  };

  const navigateGallery = (direction) => {
    let nextIndex = selectedIndex + direction;
    if (nextIndex < 0) nextIndex = photos.length - 1;
    if (nextIndex >= photos.length) nextIndex = 0;

    setSelectedIndex(nextIndex);
    setSelectedPhoto(photos[nextIndex]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsEditing(false);
  };

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsPanning(true);
      setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPanPos.x,
        y: e.clientY - startPanPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    if (selectedPhoto) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom(delta);
    }
  };

  const startEditing = (e, photo, index) => {
    if (e) e.stopPropagation();
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    setIsEditing(true);
    setEditFields({
      name: photo.name,
      caption: photo.caption || '',
      group: photo.group || ''
    });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const saveEdits = async (id) => {
    if (editFields.name.trim()) {
      const updates = {
        name: editFields.name.trim(),
        caption: editFields.caption.trim(),
        group: editFields.group.trim()
      };
      await updatePhoto(id, updates);
      await loadPhotos();
      setIsEditing(false);
      if (selectedPhoto && selectedPhoto.id === id) {
        setSelectedPhoto(prev => ({ ...prev, ...updates }));
      }
    }
  };

  return (
    <div
      className={`app-container ${isDragging ? 'drag-active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <header>
        <div className="logo-group">
          <div className="logo">Lumina Pro</div>
          <div className="tagline">Premium Snap Gallery</div>
        </div>
        <div className="header-actions">
          {groups.length > 1 && (
            <div className="group-filter glass-panel">
              <Filter size={16} />
              <select value={activeGroup} onChange={(e) => setActiveGroup(e.target.value)}>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
          <button className="import-btn" onClick={importFromClipboard}>
            <Sparkles size={20} />
            Magic Import
          </button>
        </div>
      </header>

      <div className="instruction-bar">
        <Info size={20} />
        <p>Pro Workflow: <strong>Win + Shift + S</strong> → <strong>Ctrl + V</strong> anywhere.</p>
      </div>

      <main>
        {photos.length === 0 ? (
          <div className="empty-state">
            <motion.div
              className="empty-icon-stack"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <Clipboard size={120} className="icon-base" />
              <ImageIcon size={60} className="icon-overlay" />
            </motion.div>
            <h2>Your Gallery Awaits</h2>
            <p>Ready to store your high-res captures with captions and groups.</p>
            <button className="paster-btn" onClick={importFromClipboard}>
              Check Clipboard
            </button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredPhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                layout
                className="photo-card"
                onClick={() => openViewer(photo, index)}
                whileHover={{ y: -10 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <img src={URL.createObjectURL(photo.blob)} alt={photo.name} />
                <div className="photo-info">
                  {photo.group && <span className="photo-group-tag">{photo.group}</span>}
                  <span className="photo-name">{photo.name}</span>
                  {photo.caption && <p className="photo-caption-preview">{photo.caption}</p>}
                  <div className="photo-actions">
                    <button onClick={(e) => startEditing(e, photo, index)} title="Edit Details"><Edit3 size={18} /></button>
                    <button onClick={(e) => handleDownload(e, photo.blob, photo.name)} title="Download"><Download size={18} /></button>
                    <button className="delete-btn" onClick={(e) => handleDelete(e, photo.id)} title="Delete"><Trash2 size={18} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {showFlash && <div className="capture-flash" />}

      {/* Naming / Capture Modal */}
      <AnimatePresence>
        {isNaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="naming-modal"
            >
              <h2>New Capture</h2>
              <div className="preview-container">
                <img src={capturedDataUrl} alt="Preview" />
              </div>

              <div className="input-field">
                <Type size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Title (with emojis! 🎨)"
                  value={photoName}
                  onChange={(e) => setPhotoName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="input-field">
                <Edit3 size={18} className="input-icon" />
                <textarea
                  placeholder="Add a caption... 📝"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                />
              </div>

              <div className="input-field">
                <Tag size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Group / Collection name"
                  value={photoGroup}
                  onChange={(e) => setPhotoGroup(e.target.value)}
                />
              </div>

              <div className="modal-btns">
                <button className="glass-panel" onClick={() => setIsNaming(false)}>Cancel</button>
                <button className="save-btn" onClick={handleSave}>Add to Pro Gallery</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Viewer */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="viewer-overlay"
            onWheel={handleWheel}
          >
            <div className="viewer-header">
              <div className="viewer-info">
                {isEditing ? (
                  <div className="edit-details-box glass-panel">
                    <input
                      type="text"
                      className="edit-title"
                      value={editFields.name}
                      onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                      autoFocus
                    />
                    <textarea
                      className="edit-caption"
                      value={editFields.caption}
                      placeholder="Add caption..."
                      onChange={(e) => setEditFields({ ...editFields, caption: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input
                        type="text"
                        className="edit-group"
                        value={editFields.group}
                        placeholder="Group..."
                        onChange={(e) => setEditFields({ ...editFields, group: e.target.value })}
                      />
                      <button onClick={() => saveEdits(selectedPhoto.id)} className="save-edit-btn">
                        <Check size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="viewer-metadata">
                    {selectedPhoto.group && <span className="viewer-group-tag">{selectedPhoto.group}</span>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{selectedPhoto.name}</h2>
                      <button onClick={(e) => startEditing(e, selectedPhoto, selectedIndex)} className="viewer-edit-btn">
                        <Edit3 size={24} style={{ opacity: 0.5 }} />
                      </button>
                    </div>
                    {selectedPhoto.caption && <p className="viewer-caption">{selectedPhoto.caption}</p>}
                    <p style={{ opacity: 0.4, fontSize: '0.8rem', marginTop: '0.5rem' }}>Captured on {new Date(selectedPhoto.timestamp).toLocaleString()}</p>
                  </div>
                )}
              </div>
              <button className="close-viewer" onClick={closeViewer}>
                <X size={32} />
              </button>
            </div>

            {photos.length > 1 && (
              <>
                <button className="nav-btn prev-btn" onClick={() => navigateGallery(-1)}>
                  <ChevronLeft size={48} />
                </button>
                <button className="nav-btn next-btn" onClick={() => navigateGallery(1)}>
                  <ChevronRight size={48} />
                </button>
              </>
            )}

            <div
              className="viewer-content"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={URL.createObjectURL(selectedPhoto.blob)}
                alt={selectedPhoto.name}
                className="viewer-image"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                }}
              />
            </div>

            <div className="viewer-controls">
              <button className="zoom-btn" onClick={() => handleZoom(-0.25)}>
                <ZoomOut size={24} />
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="zoom-btn" onClick={() => handleZoom(0.25)}>
                <ZoomIn size={24} />
              </button>
              <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)', margin: '0 1rem' }} />
              <button className="zoom-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                <Maximize2 size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="drop-indicator">
        <Sparkles size={64} style={{ color: 'var(--accent-secondary)' }} />
        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>Drop to save to Lumina Pro</p>
      </div>
    </div>
  );
}

export default App;
