# Test Modeling App
## What is this?
This is an application for describing test architecture in a notation similar to UML class diagrams.

## Usage
### Local execution
1. Clone the repository
2. Run `npm install` to install the dependencies
3. Run `npm start` to start the application
4. Open a web browser and navigate to `http://localhost:3000`

### Deployed application
The application is deployed at [https://tyngw.github.io/test-modeling-app/](https://tyngw.github.io/test-modeling-app/)

### Application usage
#### Keyboard shortcuts
- `Tab`: Add a child element to the selected element
- `Delete`: Remove the selected element
- `Enter`: Edit the selected element
- `Esc`: Stop editing the selected element
- `Tab` in editing mode: Move the focus to the next text box
- `Ctrl + Z`: Undo the last action
- `Shift + Ctrl + Z`: Redo the last action
- `Ctrl + X`: Cut the selected element
- `Ctrl + C`: Copy the selected element
- `Ctrl + V`: Paste the copied element
- `Ctrl + ArrowLeft`: Collapse the children of the selected element
- `Ctrl + ArrowRight`: Expand the children of the selected element

#### Mouse operations
- `Click`: Select an element
- `Double click`: Edit the selected element
  - Clicking outside the element will end the editing mode
- `Drag`: Move the selected element

#### Menu operations
- `New`: Create a new diagram. Unsaved changes will be discarded.
- `Open`: Load saved data. The current data will be discarded.
- `Save as`: Save the diagram data in JSON format
- `Export`: Export the diagram in SVG format

## License
This project is licensed under the MIT license. See [LICENSE](./LICENSE) for details.