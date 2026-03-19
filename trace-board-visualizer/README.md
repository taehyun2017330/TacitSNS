# Trace Board Visualizer

A standalone React app for creating trace board visualizations for research papers. This is a **visual-only** tool that allows you to customize every aspect of your trace board for creating publication-quality figures.

## Features

- 🎨 **Fully Customizable**: Edit images, keywords, vibes, and action types
- 🌳 **Tree Visualization**: Shows the complete multiverse tree structure of your design process
- 🎯 **Interactive Editor**: Click nodes to select and modify them
- 📊 **Multiple Action Types**: Initial, Explore, Edit, and Regenerate nodes
- 📄 **Export Ready**: Print to PDF for use in research papers
- 🔄 **Real-time Updates**: See changes instantly as you edit
- ✨ **Modern UI**: Clean, professional design with smooth animations and hover effects
- 📊 **Legend**: Visual guide for action types and feedback indicators

## Getting Started

### Installation

```bash
npm install
```

### Running the App

```bash
npm run dev
```

The app will be available at [http://localhost:3001/](http://localhost:3001/)

## How to Use

### Adding Nodes

1. Click the **"+ Add Node"** button in the sidebar
2. New nodes will be added as children of the currently selected node
3. If no node is selected, they'll be added to the root level

### Editing Nodes

1. **Click any node** in the trace board to select it
2. The **Node Editor** panel will appear in the sidebar
3. Customize the following properties:
   - **Image URL**: Enter a URL or use placeholder images
   - **Keywords**: Comma-separated list of keywords
   - **Vibe**: Description of the design vibe/mood
   - **Action Type**: Choose from Initial, Explore, Edit, or Regenerate
   - **Edit Description**: (For Edit actions) Describe what was changed
   - **Similarity %**: (For Explore actions) Set similarity percentage

### Deleting Nodes

1. Select the node you want to delete
2. Click the **"Delete Node"** button at the bottom of the Node Editor

### Edit Mode

- Click **"✏️ Edit Mode"** to make nodes more interactive
- In edit mode, nodes show visual feedback when selected
- Click **"✓ Done Editing"** to exit edit mode

### Exporting for Papers

1. Click **"📄 Export/Print"** button
2. In the print dialog, choose **"Save as PDF"**
3. The sidebar will be hidden automatically
4. All colors, borders, and styles will be preserved

## Understanding the Visualization

### Node Types

- **🟢 INITIAL**: The starting point (green border)
- **🔵 EXPLORE**: Exploring variations (blue border)
- **🟠 EDIT**: Editing specific aspects (orange border)
- **🟣 REGENERATE**: Regenerating options (purple border)

### Node Layouts

- **Single Image**: Edit and Regenerate actions show one image
- **2×2 Grid**: Explore actions show four variations
- **Keywords & Vibes**: Displayed below each image

### Edges (Arrows)

- Arrows show parent-child relationships
- Edge labels show what changed (edits, similarity, etc.)
- Colors match the target node's action type

## Sample Data

The app comes with sample data showing:
- An initial node
- Four explore variations
- An edit applied to one exploration

You can modify this data directly in [`src/App.tsx`](src/App.tsx) by editing the `initialNodes` array.

## Customization

### Adding Your Own Images

Replace the placeholder URLs in the Node Editor with:
- Direct image URLs from the web
- Local image paths (place images in `public/` folder)
- Data URLs or base64-encoded images

### Modifying the Layout

The layout is automatically calculated using the ELK (Eclipse Layout Kernel) algorithm. You can adjust spacing and direction in [`src/TraceBoard.tsx`](src/TraceBoard.tsx):

```typescript
layoutOptions: {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',  // Change to 'RIGHT', 'LEFT', 'UP'
  'elk.spacing.nodeNode': '80',  // Horizontal spacing
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',  // Vertical spacing
}
```

### Styling

- **Node styles**: Modify [`src/TraceBoard.css`](src/TraceBoard.css)
- **Sidebar styles**: Modify [`src/App.css`](src/App.css)
- **Colors**: Change `ACTION_COLORS` in [`src/TraceBoard.tsx`](src/TraceBoard.tsx)

## Technologies Used

- **React** + **TypeScript**: UI framework
- **ReactFlow**: Graph visualization library
- **ELK.js**: Automatic graph layout algorithm
- **Vite**: Build tool and dev server

## Tips for Paper Figures

1. **Keep it simple**: Don't add too many nodes - focus on key decision points
2. **Use clear labels**: Make edit descriptions and keywords concise
3. **Consistent images**: Use images with similar aspect ratios for best results
4. **Export at the right scale**: Zoom in/out before printing to get the right size
5. **High contrast**: Ensure good contrast between text and backgrounds

## File Structure

```
trace-board-visualizer/
├── src/
│   ├── App.tsx           # Main app component with editor UI
│   ├── TraceBoard.tsx    # Trace board visualization component
│   ├── types.ts          # TypeScript interfaces
│   ├── App.css           # App styles
│   ├── TraceBoard.css    # Trace board styles
│   ├── index.css         # Global styles
│   └── main.tsx          # Entry point
├── index.html            # HTML template
├── package.json          # Dependencies
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```

## Troubleshooting

### Images not showing
- Check that image URLs are accessible
- Try using placeholder images: `https://via.placeholder.com/300x300/COLOR/ffffff?text=YourText`

### Layout looks wrong
- Make sure all nodes have valid parent references
- Check that there are no circular dependencies

### Export doesn't show colors
- The CSS includes print-specific styles to force color printing
- Make sure your browser's print settings allow background colors

## License

This project is for research purposes. Feel free to modify and use it for your papers.
