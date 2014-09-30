var Game = function(objboard , objrules , objbones , objsocket){
    this.board  = objboard;
    this.rules  = objrules;
    this.bones  = objbones;
    this.socket = objsocket;
};

/* 
    #
    #  Упровляющие объекты системы
    #
*/
Game.prototype.board    = {};
Game.prototype.rules    = {};
Game.prototype.socket   = {};
// ### конец управляющих объектов системы

Game.prototype.meselement   = '#gamemessage';
Game.prototype.type         = 'long';   // тип игры
Game.prototype.onepos       = true;     // фишки распалагаются всега в одной позиции
Game.prototype.pieces       = [ /* */];
Game.prototype.side         = '';       // left || right
Game.prototype.piececolor   = '';       // white || black
// timers
Game.prototype.timelot      = 3000; // общее время жеребьевки
Game.prototype.cancelStep   = 3000; // время на отмену хода
Game.prototype.dblclicktime = 200;  // ожидание да двойной клик
Game.prototype.ruletimemes  = 2000; // время на выведение сообщений системы правил

Game.prototype.enemy        = {};

Game.prototype.imageObjects = {};

Game.prototype.step         = {
    player  : '' ,      // self || enemy 
    bones   : [] ,
    side    : 'left' ,  // left || right
    steps   : {} ,
    points  : 0
};

// global vars
Game.prototype.selectedpiece = false;


/*
    # Выводит сообщение пользователю
    #
    #
*/
Game.prototype.setMessage = function(message){
    $(this.meselement).html(message);
};

/*
    # Инициализация фишек
    #
    #
*/
Game.prototype.initPieces = function(pieces){
    
    this.pieces = [];
    
    switch(this.type){
        /*  
            ########     ########       ########    ########
            ####   Тип создания фишек для длинных нард  ####
            ########    ########        ########    ########
        */
        
        case 'long':
            for(var i = 0; i < 30; i++){
                var pieceid = pieces[i];
                if (i < 15){
                    // создаем объекты фишек
                    
                    this.pieces[i] = new Piece(
                                                'white' ,
                                                pieceid ,
                                                this.board.mainlayer ,
                                                this.board.stage ,
                                                'left' ,
                                                this.imageObjects
                                            );

                    // если фишки должны всегда находиться в одном положении
                    if(this.onepos){
                        // если соперник выиграл
                        if(this.step.player === 'enemy'){
                            // распологаем белые слева
                            this.enemy.side = 'left';
                            this.side       = 'right';
                            
                            this.startPiecesPositions(
                                this.pieces[i].obj ,
                                13 ,
                                this.pieces[i]
                                );
                        }else{
                            // располагаем черные справа
                            this.enemy.side = 'right';
                            this.side       = 'left';
                            this.startPiecesPositions(
                                this.pieces[i].obj ,
                                1 ,
                                this.pieces[i]
                            );
                        }
                    }
                }else{
                    this.pieces[i] = new Piece(
                            'black' ,
                            pieceid ,
                            this.board.mainlayer ,
                            this.board.stage ,
                            'right' ,
                            this.imageObjects
                        );
                    
                    // если фишки должны всегда находиться в одном положении
                    if(this.onepos){
                        // если соперник выиграл
                        if(this.step.player === 'enemy'){
                            // распологаем черные справа
                            this.startPiecesPositions(
                                this.pieces[i].obj ,
                                1 ,
                                this.pieces[i]
                            );
                        }else{
                            // распологаяем черные слева
                            this.startPiecesPositions(
                                this.pieces[i].obj ,
                                13 ,
                                this.pieces[i]
                            );
                        }
                    }
                }
            }
            break;
        default : console.error("Передан неизвестный тип игры");
    }
}


/*
    #
    # procedure startPiecesPositions(obj pieceobj , num fieldnum)
    # функция для стартового перемещения фишек
    #
*/

Game.prototype.startPiecesPositions = function(pieceobj , fieldnum , piece){
    var position = this.board.calcLastFieldPos(fieldnum);
    
    piece.x = position.x;
    piece.y = position.y;    
    
    // перемещаем фишку
     pieceobj.x(position.x);
     pieceobj.y(position.y);
            
    // добавляем фишку на поле
    this.board.addPiece(pieceobj.id() , fieldnum);
}

/*
    # Устанавливаем слушателей серевера :-)
    #
    #
*/
Game.prototype.setListener = function(name , obj , fun){
    var self = this;
    this.socket.connection.on(name , function(data){
        if(obj === 'Game'){
            if(fun in self){
                self[fun](data);
            }else{console.error("В объекте game не найден метод " , fun)}
        }else{
            if(obj in self){
                if(fun in self[obj]){
                    self[obj][fun](data);
                }else{
                    console.error(
                            "Обращение к несуществующему методу в объекте " ,
                            obj ,
                            fun
                        );
                }
            }else{ console.error("Обращение к несуществующему объекту " , obj);}
        }
    });
};

Game.prototype.sendRequest = function(name , data){
    this.socket.connection.emit(name , data);
};

/*
    # Регестрируемся на сервере
    # 
    #
*/
Game.prototype.registrOnServer = function(data){
    this.socket.connection.emit('registr' , data );
    this.setMessage("Ожидание подключения соперника");
};

/*
    # Главная функция шага
    # Активирует необходимые фишки
    #
*/
Game.prototype.letsRock = function(){
    // Чей сейчас ход (self  || enemy)
    var player = this.step.player;
    
    // Выводим сообщение
    if(player === 'enemy'){
        this.setMessage('Ход противника');
    }else{this.setMessage('Ваш ход');}
    
    if(player === 'self'){
        // Считаем количество ходов
        this.calcPoints();
        
        // Теперь необходимо активировать возможные фишки
        this.activatePieces();
    }
};

/*
    # Чистим необходимые данные
*/
Game.prototype.clearData = function(){
    
};

/*
    # Считаем сколько у нас полей в распоряжении 
*/
Game.prototype.calcMyFields = function(){
    var countfields = 0;
    
    // перебираем поля
    for(var field = 1; field < this.board.fields.length; field++){
        // если поле содержит фишки
        if(this.board.fields[field].pieces.length !== 0){
            // является ли поле игрока
            if(this.myField(field)){
                countfields++;
            }
        }
    }
    
    return countfields;
};

Game.prototype.countFreeSteps = function(){
    var count = 0;
    
    for(var i = 0; i < this.step.steps.length; i++){
        if(this.step.steps[i][1] === 0){
            count++;
        }
    }
    
    return count;
};

/*
    # Перебирает поля и активирует возможно ходящие фишки
    #
    #
*/
Game.prototype.activatePieces = function(){
    var countcanmove    = 0;
    var self            = this;
    
    // отправляем в прававой объект поля доски
    this.rules.setFields(this.board.fields);
    // отправляем объект шагов правовому объетку
    this.rules.setSteps(this.step.steps);
    
    // перебираем поля
    for(var field = 1; field < this.board.fields.length; field++){
        // если поле содержит фишки
        if(this.board.fields[field].pieces.length !== 0){
            // является ли поле игрока
            if(this.myField(field)){
                var canmove = this.rules.canMove(field);
                // если поле может ходить
                if(canmove){
                    countcanmove++;
                    
                    // получаем количество оставшихся ходов
                    var countfreesteps = this.countFreeSteps();
                    var lastpieces = this.getLastPieces(field , countfreesteps);
                    
                    // получаем последнюю фишку
                    var lastpiece = this.getLastPiece(field);
                    
                    this.setDraggablePieces(lastpieces , field);
                    
                    
                }else{
                    console.log('Поле непередвигаемое' , field);
                }
            }else{
                if(field === 1 || field === 13){
                    console.log('Это не поле игрока' , field);
                }
            }
        }       // if pieces.length !== 0
    }           // for fields
    
    /*
        # Если закончились шаги
        # даем возможность отмены хода
    */
    if(countcanmove === 0){
        console.log("Закончились шаги");
        this.setMessage("Отмена хода 3 сек");
        
        var piece , piecepos;
        var pieces = [];
        
        // собираем фишки для активации
        for(var i = 0; i < this.step.steps.length; i++){
            if(pieces.indexOf(this.step.steps[i][3]) === -1){
                pieces.push(this.step.steps[i][3])
            }
        }
        
        // пробигаемся по этим фишкам и активируем
        for(var i = 0; i < pieces.length; i++){
            piece       = this.getPiece(pieces[i]);
            piecepos    = this.calcPiecePos(pieces[i]);
            
            // активируем фишки, которыми ходили
            this.setDraggable(piece.obj , piecepos[0]);
        }
        
        // если игрок не отменил свой ход передаем ход
        setTimeout(function() {
                if(self.lastStep()){
                    self.finishSteps();
                }else{
                    self.setMessage("Ход отменен");
                }
        }, self.cancelStep);
    }
};

Game.prototype.finishSteps = function(){
    console.info('Закончился ход');
    this.setMessage('Передача хода');
    this.blockedPieces();
    
};


/*
    # Отрабатываем клики на фишке
*/
Game.prototype.setClicksPiece = function(node , oldfield){
    var pieceobj = this.getPiece(node.id());
    var self = this;
    var timer;
    
    console.log('last: ' , pieceobj.last);
    
    // если фишка последняя в ряду, то ее можно выделять
    if(pieceobj.last){
    
    node.on('click' , function(){
        var node = this;
        if(timer) clearTimeout(timer);
        
        timer = setTimeout(function() {
            
            self.selectPiece(node);
            
        }, self.dblclicktime);
    });
    
    // двойной клик по фишке перемещает фишку на минимальное значение
    node.on('dblclick' , function(){
        var node = this;
        
        clearTimeout(timer);
        
        var nowfield = self.calcPiecePos(node.id())
        
        // вычисляем поле, на которое может сходить фишка
        var movefield   =   self.rules.calcMove(
                                oldfield ,
                                nowfield[0] + 1 ,
                                node.id()
                            );
        
        // удаляем идентификатор фишки из предыдущей позиции
        var lastpos     = self.calcPiecePos(node.id());
        self.board.fields[lastpos[0]].pieces.splice(lastpos[1] , 1);
        
        // вычисляем координаты поля на которое можно сходить
        var pos         = self.board.calcLastFieldPos(movefield);
        
        pieceobj.moveTo(pos.x , pos.y);
        
        // перемещаем идентификатор фишки
        self.moveIdPiece(movefield , node.id());
        
        // завершающие действия хода
        self.endDrag(pieceobj);
    });
    
    }
}

Game.prototype.setDraggablePieces = function(pieces , field){
    var self        = this;
    var movelist    = [];
    
    // устанавливаем клики по доске
    this.setClickBoard();
    
    // перебираем фишки в данном поле
    for(var i = 0; i < pieces.length; i++){
        // указываем, что фишку можно выделять
        if(i === 0) pieces[i].last = true;
        
        var n = i;
        
        if(n !== 0){
            pieces[i].obj.on('dragmove' , function(){
                var node = this;
                
                pieces[n - 1].obj.x(node.x());
                pieces[n - 1].obj.y(node.y() - self.board.pieceheight);
                self.board.stage.batchDraw();
            });
            
            pieces[i].obj.on('dragstart' , function(){
                console.log('dragstart');
            });
            
            movelist.push(pieces[n-1]);
            console.log('movelist: ' , movelist);
        }
        
        this.setDraggable(pieces[i].obj , field , movelist);
        
    }
};

Game.prototype.setDraggable = function(piece , oldfield , lastpiece , movelist){
    var self        = this;
    var pieceobj    = this.getPiece(piece.id());
    
    // устанавливаем клики по фишке
    this.setClicksPiece(piece , oldfield);
    
    // делаем фишку перетаскиваемой
    piece.draggable(true);
    
    var move = movelist;
    
    piece.on('dragend' , function(){
        var x = this.x();
        var y = this.y();
        
        self.movePiece(x , y , oldfield , pieceobj);
        
        if(move !== undefined){
            if(move.length !== 0){
                for(var i = 0; i < movelist.length; i++){
                    self.movePiece(x , y , oldfield , movelist[i]);
                }
            }
        }
    });
    
};

Game.prototype.movePiece = function(x , y , oldfield , piece){
    // вычисляем поле на котором остановилась фишка
    var newfield    = this.board.calcField(x , y);
        
    // вычисляем поле, на которое может сходить фишка
    var movefield   = this.rules.calcMove(oldfield , newfield , piece.id);
        
    // удаляем идентификатор фишки из предыдущей позиции
    var lastpos     = this.calcPiecePos(piece.id);
    this.board.fields[lastpos[0]].pieces.splice(lastpos[1] , 1);
        
    // вычисляем координаты поля на которое можно сходить
    var pos         = this.board.calcLastFieldPos(movefield);
        
    // перемещаем идентификатор фишки
    this.moveIdPiece(movefield , piece.id);
        
    // перемещаем фишку
    piece.moveTo(pos.x , pos.y);
    
    if(piece.last){
        // завершающие действия хода
        this.endDrag(pieceobj);
    }else{
            
    }
};

Game.prototype.endDrag = function(piece){
    var node = piece.obj;
    // очищаем обработчики перемещения для новых расчетов
    node.off('dragend');
    node.off('click');
    node.off('dblclick');
    this.board.mainlayer.off('click');
    
    // снимаем выделение выделенной фишки
    //this.unselectPiece();
    
    // после завершения хода блокируем фишки, для новых расчетов
    this.blockedPieces();
    
    this.activatePieces();
};

/*
    # Одинарный клик по фишке, выделяет её
    # для дальнейшей манипуляции
*/
Game.prototype.selectPiece = function(piece){
    var self = this;
    
    function select(piece){
        self.selectedpiece = piece;
        self.selectedpiece.strokeEnabled(true);
        self.selectedpiece.stroke('#000');						
	    self.board.stage.batchDraw();
	    
    }
    
    if(this.selectedpiece === false){
        select(piece);
        this.setClickBoard();
        
    // если кликнули на ту же самую фишку - снимаем выделение
    }else if(this.selectedpiece.id() !== piece.id()){
        select(piece);
        this.setClickBoard();
    }else{
        this.unselectPiece();
    }
};

/*
    # Проверяем и снимаем выделение с выделенной фишки
*/
Game.prototype.unselectPiece = function(){
    if(this.selectedpiece !== false){
	    this.selectedpiece.strokeEnabled(false);
	    this.selectedpiece = false;
	    this.board.stage.batchDraw();
	}
};

/*
    # отрабатываем клики по самой доске
*/
Game.prototype.setClickBoard = function(){
    var self = this;
    
    if(this.selectedpiece !== false){
        
    this.board.mainlayer.on('click' , function(){
        if(self.selectedpiece !== false){
            var selectedpos = self.calcPiecePos(self.selectedpiece.id());
            var piece = self.getPiece(self.selectedpiece.id());
            
            // получаем координаты курсора
            var mousePos = self.board.stage.getPointerPosition();
            
            // вычисляем поле на котором остановилась фишка
            var newfield    = self.board.calcField(mousePos.x , mousePos.y);
            
            // вычисляем поле, на которое может сходить фишка
            var movefield   =   self.rules.calcMove(
                                    selectedpos[0] ,
                                    newfield ,
                                    self.selectedpiece.id() ,
                                    true
                                );
            
            // если можно сходить по кликанному полю
            if(movefield !== false){
                // удаляем идентификатор фишки из предыдущей позиции
                var lastpos     = self.calcPiecePos(self.selectedpiece.id());
                self.board.fields[lastpos[0]].pieces.splice(lastpos[1] , 1);
                
                // вычисляем координаты поля на которое можно сходить
                var pos         = self.board.calcLastFieldPos(movefield);
                
                // перемещаем идентификатор фишки
                self.moveIdPiece(movefield , self.selectedpiece.id());
                
                // перемещаем фишку
                piece.moveTo(pos.x , pos.y);
                
                // после завершения хода блокируем фишки, для новых расчетов
                self.blockedPieces();
                
                // очищаем обработчик перемещения для новых расчетов
                //self.selectedpiece.off('dragend');
                
                self.endDrag(piece);
                
                //self.activatePieces();
            }else{
                self.setMessage("Невозможно сходить на данное поле");
                setTimeout(function() {
                    self.setMessage("Ваш ход");
                }, self.ruletimemes);
            }
        }
    });
    
    }{console.log('not selected');} // if selectedpiece !== false;
};

/*
    # Функция проверяет сделан ли последний шаг
*/
Game.prototype.lastStep = function(){
    var countcomplete = 0;
    
    for(var i = 0; i < this.step.steps.length; i++){
        if(this.step.steps[i][1] !== 0){
            countcomplete++;
        }
    }
    
    if(this.step.steps.length === 2){
        if(countcomplete === 2){
            return true;
        }else{
            return false;
        }
    }
    
    if(this.step.steps.length === 4){
        if(countcomplete === 4){
            return true;
        }else{
            return false;
        }
    }
};

Game.prototype.blockedPieces = function(){
    for(var i = 0; i < this.pieces.length; i++){
        this.pieces[i].obj.draggable(false);
    }
};


/*
    # Перемещает в полях идентификаторы
    #
    #
*/
Game.prototype.moveIdPiece = function(newfield , id){
    this.board.fields[newfield].pieces.push(id);
};

/*
    # ищет фишку в полях
    #
    #
*/
Game.prototype.calcPiecePos = function(id){
    var piece = false;
    for(var i = 1; i <= this.board.fields.length; i++){
		if(this.board.fields[i] !== undefined){
			for(var n = 0; n < this.board.fields[i].pieces.length; n++){
				if(this.board.fields[i].pieces[n] !== undefined){
					if(id == this.board.fields[i].pieces[n]){
						piece = [i , n];
					}
    			}
			}
		}
	}
	return piece;
};

/*
    # Функция возвращает count количество последних фишек в поле field
*/
Game.prototype.getLastPieces = function(field , count){
    var result      = [];
    var controll    = true;
    var counter     = 1;
    var pieces      = this.board.fields[field].pieces;
    
    while(controll){
        if(pieces[pieces.length - counter] !== undefined){
            result.push(this.getPiece(pieces[pieces.length - counter]));
        }
        
        if(counter === count){controll = false;}
        counter++;
    }
    
    if(result.length !== 0){
        return result;
    }else{
        return false;
    }
};

/*
    # fun getLastPiece
    # возвращает последнюю фишку в поле
    #
*/
Game.prototype.getLastPiece = function(field){
    var lastkey = this.board.fields[field].pieces.length-1;
    var lastid  = this.board.fields[field].pieces[lastkey];
    
    var pieceobj = this.getPieceObj(lastid);
    if(!pieceobj){console.error('При получении последей фиши произошла ошибка')}
    
    return pieceobj;
};

Game.prototype.getPieceObj = function(id){
    var object = false;
    for(var i = 0; i < this.pieces.length; i++){
       if(this.pieces[i].id === id){
           object = this.pieces[i].obj;
       }
    }
    
    return object;
};

Game.prototype.getPiece = function(id){
    var object = false;
    for(var i = 0; i < this.pieces.length; i++){
       if(this.pieces[i].id === id){
           object = this.pieces[i];
       }
    }
    
    return object;
}

/*
    # Функция определяет свое ли поле
    #
    #
*/
Game.prototype.myField = function(field){
    // есть ли на поле вообще фишки
    if(this.board.fields[field].pieces.length !== 0){
        // берем идентификатор первой фишки в поле
       var pieceid  = this.board.fields[field].pieces[0];
       var piecenum = 0;
       // ищем фишку в объекте фишек
       for(var i = 0; i < this.pieces.length; i++){
           if(this.pieces[i].id === pieceid){
               piecenum = i;
           }
       }
       
       // если тип фишки совпадает с типом игрока
       if(this.pieces[piecenum].color === this.piececolor){
           // значит поле игрока
           return true;
       }else{
           if(field === 1){
            console.log('Не совпадает цвет фишки. ' 
                        + '  piececolor:' + this.pieces[piecenum].color 
                        + '; mycolor: ' + this.piececolor 
                        + '; pieceid: ' + this.pieces[piecenum].id
                        + '; piecenum: ' + piecenum);
                        this.pieces[piecenum].obj.stroke('green');
           }
           return false;
       }
    // если поле свободное
    }else{
        if(field === 1){
            console.log('Поле свободное' , field);
        }
        return false;
    }
};

Game.prototype.calcPoints = function(){
    var bone1 , bone2;
    
    if(this.step.bones[0] < this.step.bones[1]){
        bone1 = this.step.bones[0];
        bone2 = this.step.bones[1];
    }else{
        bone1 = this.step.bones[1];
        bone2 = this.step.bones[0];
    }
    
    // колчество возможных шагов
    var steps = (bone1 === bone2) ? 4 : 2;
    
    var st = [];
    
    //st[ячейка очка] = [valbone , текущее поле , старое поле, id фишки]
    
    if(steps === 2){
        st[0] = [bone1 , 0 , 0 , 0];
        st[1] = [bone2 , 0 , 0 , 0];
    }
    
    if(steps === 4){
        st[0] = [bone1 , 0 , 0 , 0];
        st[1] = [bone1 , 0 , 0 , 0];
        st[2] = [bone1 , 0 , 0 , 0];
        st[3] = [bone1 , 0 , 0 , 0];
    }
    
    this.step.steps = st;
};


/* 
    # Получаем стартовые данные об игре
    # и инициализируем игру
    #
*/
Game.prototype.takeGameData = function(data){
    var self = this;
    
    if(typeof(data) === 'object'){
        if(
                'id'         in data
            &&  'pieces'     in data
            &&  'bones'      in data
            &&  'lotbones'   in data
        ){
            if(
                data.id         !== undefined
                && data.pieces  !== undefined
                && data.bones   !== undefined
                && data.lotbones!== undefined
            ){
                console.log('Получены данные начала игры с сервера: ' , data);
                // Сохраняем значение костей для хода
                this.step.bones = data.bones;
                //this.step.bones = [2 , 2];
                
                // Анимируем жеребьевку
                this.animateLot(data.lotbones);
                
                // Определяем чей ход
                if(data.lotbones[0] > data.lotbones[1]){
                    this.step.player        = 'self';
                    this.piececolor         = 'white';
                    this.board.piececolor   = 'white';
                }else{
                    this.step.player        = 'enemy';
                    this.piececolor         = 'black';
                    this.board.piececolor   = 'black';
                }
                
                /*
                    # Инициализация фишек
                    # Она происходит после анимации жеребьевки
                    #
                */
                setTimeout(function() {
                    self.initPieces(data.pieces);
                    self.moveBonesToNeed();
                    
                    // После передвижения фишек, снова взбалтываем их
                    // для определения очков хода
                    setTimeout(function(){
                        // время тряски
                        var shaketime   = self.timelot / 6;
                        // взбалтываем первую кость
                        self.bones.shake(0 , shaketime , self.step.bones[0]);
                        
                        setTimeout(function(){
                            // взбалтываем вторую кость
                            self.bones.shake(1 , shaketime , self.step.bones[1]);
                            
                            // НАКОНЕЦ НАЧИНАЕМ ИГРУ!!!
                            self.letsRock();
                            
                        } , shaketime);
                    // время ожидания равно длительности анимации
                    } , self.bones.moveanimtime);
                }, this.timelot);
                
            }else{console.error("Один из параметров игры не определен" , data )}
        }else{console.error("Один из параметров игры отсутсвует. " , data );}
    }else{console.error("Данные игры переданы не объектом" , data );}
};

Game.prototype.moveBonesToNeed = function(){
    // если фишки должны всегда находиться в одном положении
    if(this.onepos){
        if(this.step.player === 'enemy'){
            if(this.enemy.side === 'left'){
                this.bones.moveToSide(2 , 'left');
            }else{
                this.bones.moveToSide(2 , 'right');
            }
        }else{
            if(this.enemy.side === 'left'){
                this.bones.moveToSide(2 , 'right');
            }else{
                this.bones.moveToSide(2 , 'left');
            }
        }
    }
};

/*
    # Функция анимаирует жеребьевку
    # lots - значение костей -> array(lot1 , lot2)
    #
*/
Game.prototype.animateLot = function(lots){
    var self        = this;
    var shaketime   = this.timelot / 6;
    
    this.setMessage('Игрок подключен. Идет жеребьевка');

    // меням сторону расположения кости
    this.bones.changeSide(0 , 'left');
    // взбалтываем и перемешиваем
    this.bones.shake(0 , shaketime , lots[0]);

    // спустя секунды шейкеруем 2 кость
    setTimeout(function() {
        // перемещаем 2 кость вправо
        self.bones.changeSide(1 , 'right');
        // взбалтываем и перемещиваем
        self.bones.shake(1 , shaketime , lots[1]);
        // Отображаем чей ход
        if(self.step.player === 'enemy'){
            self.setMessage('Жеребьевка окончена. Ход противника');
        }else{
            self.setMessage('Жеребьевка окончена. Ваш ход');
        }
    }, shaketime);
};

Game.prototype.loadImages = function(callback){
    var self = this;
    var imagesrcWhite    = '../images/pieces/white.png';
    var imagesrcBlack    = '../images/pieces/black.png';
    
    var whiteObj = new Image();
    var blackObj = new Image();
    
    whiteObj.onload = function(){
        self.imageObjects = {white : whiteObj , black : blackObj};
        
        callback();
    };
    whiteObj.src = imagesrcWhite;
    blackObj.src = imagesrcBlack;
}