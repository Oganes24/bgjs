var Piece = function(color , id , layer , stage , type){
    var imagesrc = '';
    var controll = true;
    
    if(layer !== undefined && stage !== undefined && id !== undefined && type !== undefined){
        this.layer  = layer;
        this.stage  = stage;
        this.type   = type;
        this.id     = id;
    }else{
        controll    = false;
    }
    
    switch (color) {
        case 'white':
            imagesrc    = '../images/pieces/white.png';
            break;
        case 'black':
            imagesrc    = '../images/pieces/black.png';
            break;
        default:
            console.error('Передан неизвестный цвет фишек');
            controll = false;
    }
    
    if(controll){
        // инициализируем изображение
        var pimage = new Image();
        pimage.src = imagesrc;
        
        // создаем Kineticjs изображение
        var pimageobj = new Kinetic.Image({
            x       : 0 ,
            y       : 0 ,
            id      : this.id ,
            width   : this.width ,
            height  : this.height ,
            image   : pimage ,
            
            draggable : true
        });
        
        this.obj = pimageobj;
        
        this.layer.add(pimageobj);
        this.stage.batchDraw();
    }else{
        console.error("При создании фишки произошла ошибка. Проверьте переданные аргументы");
    }
};

Piece.prototype.x       = 0;
Piece.prototype.y       = 0;
Piece.prototype.field   = 0;
Piece.prototype.width   = 30;
Piece.prototype.height  = 30;

Piece.prototype.id      = '';
Piece.prototype.type    = '';

Piece.prototype.layer   = {};
Piece.prototype.stage   = {};
Piece.prototype.obj     = {};