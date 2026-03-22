import { Plugin, Notice, getLinkpath } from 'obsidian'

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogv', 'ogg', 'mov', 'mkv']);
const FALLBACK_IMG = 'https://raw.githubusercontent.com/jpoles1/obsidian-litegal/eb0e30b2709a3081dd8d32ef4371367b95694881/404notfound.jpg';

interface MediaItem {
	src: string;
	isVideo: boolean;
}

function isVideoUrl(url: string): boolean {
	const ext = url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || '';
	return VIDEO_EXTENSIONS.has(ext);
}

export default class LiteGallery extends Plugin {
	async onload () {
		this.registerMarkdownCodeBlockProcessor("litegal", async (source, el, ctx) => {
			let active_slide = 0;
			let preview_scroll_speed = 0;

			const media_list: MediaItem[] = source.split('\n')
				.map((line) => line.replace(/!?\[\[/, "").replace("]]", "").trim())
				.filter((line) => line)
				.map((entry) => {
					if (entry.match(/^(http|https):\/\//)) {
						return { src: entry, isVideo: isVideoUrl(entry) };
					}
					var linkpath = getLinkpath(entry)
					var file = this.app.metadataCache.getFirstLinkpathDest(linkpath, entry)
					if (file == null) {
						new Notice(`LiteGallery: File not found: ${entry}`)
						return null
					}
					return {
						src: this.app.vault.getResourcePath(file),
						isVideo: VIDEO_EXTENSIONS.has(file.extension.toLowerCase())
					}
				})
				.filter((item): item is MediaItem => item !== null)

			// Lightbox (created unconditionally, only shown when needed)
			const lightbox_container = document.body.createEl('div', {
				cls: 'litegal-lightbox-container hidden'
			})

			const lightbox = lightbox_container.createEl('div')
			lightbox.classList.add('litegal-lightbox')
			lightbox.onclick = (event) => {
				event.stopPropagation()
			}

			const gallery = el.createEl('div', { cls: 'litegal' })

			if (media_list.length > 0) {

				// --- Active slide area ---
				const active_container = gallery.createEl('div', { cls: 'litegal-active' })
				const active_inner = active_container.createEl('div', { cls: 'litegal-active-inner' })

				// --- Lightbox internals ---
				const lb_larrow = lightbox.createEl('div', {
					text: '<', cls: 'litegal-arrow litegal-arrow-left'
				})
				const lb_rarrow = lightbox.createEl('div', {
					text: '>', cls: 'litegal-arrow litegal-arrow-right'
				})
				const lb_media = lightbox.createEl('div', { cls: 'litegal-lightbox-media' })
				const lb_exit = lightbox.createEl('div', {
					text: 'X', cls: 'litegal-lightbox-exit'
				})

				// --- Helpers ---
				function pauseVideo(container: HTMLElement) {
					const video = container.querySelector('video')
					if (video) video.pause()
				}

				function setActiveMedia() {
					pauseVideo(active_inner)
					active_inner.empty()
					const item = media_list[active_slide]
					if (item.isVideo) {
						const video = active_inner.createEl('video')
						video.src = item.src
						video.controls = true
						video.preload = 'metadata'
					} else {
						const img = active_inner.createEl('img')
						img.src = item.src
						img.onerror = function() { this.src = FALLBACK_IMG }
						img.onclick = () => {
							lightbox_container.removeClass('hidden')
							setLightboxMedia()
						}
					}
				}

				function setLightboxMedia() {
					pauseVideo(lb_media)
					lb_media.empty()
					const item = media_list[active_slide]
					if (item.isVideo) {
						const video = lb_media.createEl('video', { cls: 'litegal-lightbox-image' })
						video.src = item.src
						video.controls = true
						video.preload = 'metadata'
					} else {
						const img = lb_media.createEl('img', { cls: 'litegal-lightbox-image' })
						img.src = item.src
						img.onerror = function() { this.src = FALLBACK_IMG }
					}
				}

				function closeLightbox() {
					lightbox_container.addClass('hidden')
					pauseVideo(lb_media)
				}

				function navigate(delta: number) {
					active_slide = (active_slide + delta + media_list.length) % media_list.length
					setActiveMedia()
				}

				// --- Wire lightbox close handlers ---
				lightbox_container.onclick = closeLightbox
				lb_exit.onclick = closeLightbox
				document.addEventListener('keydown', (event) => {
					if (event.key === 'Escape') closeLightbox()
				})

				lb_larrow.onclick = () => {
					navigate(-1)
					setLightboxMedia()
				}
				lb_rarrow.onclick = () => {
					navigate(1)
					setLightboxMedia()
				}

				// Initial render
				setActiveMedia()

				// --- Gallery navigation arrows ---
				const larrow = active_container.createEl('div', {
					text: '<', cls: 'litegal-arrow litegal-arrow-left'
				})
				larrow.onclick = () => navigate(-1)

				const rarrow = active_container.createEl('div', {
					text: '>', cls: 'litegal-arrow litegal-arrow-right'
				})
				rarrow.onclick = () => navigate(1)

				// --- Preview strip ---
				const preview_outer = gallery.createEl('div', { cls: 'litegal-preview-outer' })

				const preview_larrow = preview_outer.createEl('div', {
					text: '<', cls: 'litegal-arrow litegal-arrow-left'
				})
				preview_larrow.onmouseenter = () => { preview_scroll_speed = -5 }
				preview_larrow.onmouseleave = () => { preview_scroll_speed = 0 }

				const preview_rarrow = preview_outer.createEl('div', {
					text: '>', cls: 'litegal-arrow litegal-arrow-right'
				})
				preview_rarrow.onmouseenter = () => { preview_scroll_speed = 5 }
				preview_rarrow.onmouseleave = () => { preview_scroll_speed = 0 }

				const preview_container = preview_outer.createEl('div', { cls: 'litegal-preview' })

				setInterval(() => {
					preview_container.scrollLeft += preview_scroll_speed
				}, 10)

				media_list.forEach((item, i) => {
					let preview: HTMLElement
					if (item.isVideo) {
						const video = preview_container.createEl('video', { cls: 'litegal-preview-img' })
						video.src = item.src
						video.preload = 'metadata'
						video.muted = true
						preview = video
					} else {
						const img = preview_container.createEl('img', { cls: 'litegal-preview-img' })
						img.src = item.src
						img.onerror = function() { this.src = FALLBACK_IMG }
						preview = img
					}
					preview.onclick = () => {
						active_slide = i
						setActiveMedia()
					}
				})

			} else {
				gallery.createEl('p', {
					text: 'No media found, please check your file list.',
					cls: 'litegal-no-images'
				})
			}
		})
	}

	onunload () {
	}
}
