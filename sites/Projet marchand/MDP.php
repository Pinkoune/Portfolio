<html>
    <head>
        <meta charset="UTF-8">
        <title>boiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii</title>
    </head>
    <body>
        <?php
            if(isset($_POST(['aleatoire']){
                for($i = 1; $i < 15; $i++){
                    $beat = rand(32,127);
                    echo chr($beat);
                }
            }
            if(isset[$_POST('chiffre')]){
                for($i = 1; $i < 15; $i++){
                    $beat = rand(48,57);
                    echo chr($beat);
                }
            }
            elseif(isset[$_POST('lettre')]){
                for($i = 1; $i < 15; $i++){
                    $beat = rand(65,122);
                    echo chr($beat);
                }
            }
            elseif(isset[$_POST('CaracSpécial')]){
                for($i = 1; $i < 15; $i++){
                    $beat = rand(33,47);
                    echo chr($beat);
                }
            }
        ?>
        <from action='MDP.php' method="POST">
            Nombre et caractères : <input type='number' name='nb'/>
        <input type='submit' name='gen' value='Generer'/>
    </body>
</html>