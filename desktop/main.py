import sys
from PyQt5.QtWidgets import QApplication
from ui.main_window import MainWindow

def main():
    
    QApplication.setAttribute(1, True) 
    QApplication.setAttribute(10, True) 

    app = QApplication(sys.argv)
    app.setStyle("Fusion") 

    window = MainWindow()
    window.show()

    sys.exit(app.exec_())

if __name__ == "__main__":
    main()