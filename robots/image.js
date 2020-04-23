const imageDownloader = require('image-downloader')
const google = require('googleapis').google
const customSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')
async function robot() {
  const content = state.load()

  await fetchImagesOffAllSentences(content)

  await downloadAllImages(content)
  state.save(content)

  async function fetchImagesOffAllSentences(content) {
    for (const sentence of content.sentences) {
      const query = `${content.prefix} ${content.searchTerm} ${sentence.keywords[0]}`
      sentence.images = await fetchGoogleAndReturnImagesLinks(query)
      
      sentence.googleSearchQuery = query
    }
  }
  
  async function fetchGoogleAndReturnImagesLinks(query) {
    const response = await customSearch.cse.list({
      auth: googleSearchCredentials.apiKey,
      cx: googleSearchCredentials.searchEngineID,
      q: query,
      searchType: 'image',
      num: 2
    })

    if (response.data.items) {
      try {
        const imagesUrl = response.data.items.map((item) => {
          return item.link
        })
        return imagesUrl
      }
      catch(e) {
        return imagesUrl
      }
    }

  }

  async function downloadAllImages(content) {
    content.downloadedImages = []

    if (content.sentences) {
      for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
        const images = content.sentences[sentenceIndex].images
        
        if (images) {
          for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
            const imageUrl = images[imageIndex]
    
            try {
              if (content.downloadedImages.includes(imageUrl)) {
                throw new Error('Imagem já foi baixada')
              }
              
              await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`)
              content.downloadedImages.push(imageUrl)
              console.log(`> [${sentenceIndex}][${imageIndex}] Baixou com sucesso : ${imageUrl}`)
              break
            } catch (err) {
              console.log(`> [${sentenceIndex}][${imageIndex}] Erro ao baixar (${imageUrl}): ${err}`)
            }
          }          
        }
      }
    }
  }
  async function downloadAndSave(url, fileName) {
    return imageDownloader.image({
      url: url,
      dest: `./content/${fileName}`
    })
  }

}

module.exports = robot